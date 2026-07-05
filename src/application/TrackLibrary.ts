import type { Track } from '../model/Track'
import { TrackMeta } from '../model/TrackMeta'
import type { TrackSource } from './sources/TrackSource'

export type SourceProgress = {
  total: number
  queued: number
  loading: number
  ready: number
  error: number
}

export type TrackLoadRuntimeStatus = 'idle' | 'loading' | 'ready' | 'error'

export type TrackLoadRuntimeState = {
  readonly status: TrackLoadRuntimeStatus
  readonly error: string | null
}

type FocusedTrackState = {
  track: Track
  version: number
}

export type TrackLibraryChange = {
  mapChanged: boolean
}

type Listener = (change: TrackLibraryChange) => void

export type TrackLibraryPersistentState = {
  readonly sources: readonly TrackSource[]
  readonly trackMetas: readonly TrackMeta[]
}

export class TrackLibrary {
  public readonly sources: TrackSource[] = []
  public readonly trackMetas: TrackMeta[] = []
  public activeMeta: TrackMeta | null = null
  public focusedTrack: FocusedTrackState | null = null
  public lastError: string | null = null

  private readonly listeners = new Set<Listener>()
  private readonly deletedSources = new Set<TrackSource>()
  private readonly metadataLoadingSources = new Set<TrackSource>()
  private trackLoadStates = new WeakMap<TrackMeta, TrackLoadRuntimeState>()
  private loadingTracks = new WeakMap<TrackMeta, Promise<Track | null>>()

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  public persistentState(options: { includeTrackGeometry?: boolean } = {}): TrackLibraryPersistentState {
    const includeTrackGeometry = options.includeTrackGeometry ?? true

    return {
      sources: this.sources,
      trackMetas: includeTrackGeometry
        ? this.trackMetas
        : this.trackMetas.map((meta) => this.metaWithoutTrackGeometry(meta)),
    }
  }

  public restorePersistentState(state: TrackLibraryPersistentState): void {
    this.sources.splice(0, this.sources.length, ...state.sources)
    this.trackMetas.splice(
      0,
      this.trackMetas.length,
      ...state.trackMetas.filter((meta) => meta.source !== null),
    )
    this.activeMeta = null
    this.focusedTrack = null
    this.lastError = null
    this.deletedSources.clear()
    this.metadataLoadingSources.clear()
    this.trackLoadStates = new WeakMap<TrackMeta, TrackLoadRuntimeState>()
    this.loadingTracks = new WeakMap<TrackMeta, Promise<Track | null>>()

    for (const meta of this.trackMetas) {
      if (meta.loadStatus === 'loading') {
        meta.loadStatus = 'queued'
      }

      this.setTrackLoadState(meta, meta.track === null ? 'idle' : 'ready')
    }

    const firstReadyMeta = this.trackMetas.find((meta) => meta.track !== null) ?? null
    const firstMeta = firstReadyMeta ?? this.trackMetas[0] ?? null

    if (firstMeta !== null) {
      this.activeMeta = firstMeta

      if (firstMeta.track !== null) {
        this.focusedTrack = { track: firstMeta.track, version: Date.now() }
      } else {
        void this.loadTrack(firstMeta)
      }
    }

    this.notify(true)
  }

  public async addSource(source: TrackSource): Promise<void> {
    this.lastError = null
    this.sources.push(source)
    this.metadataLoadingSources.add(source)
    this.notify(true)

    try {
      const metas = await source.loadTrackMetas()

      if (this.deletedSources.has(source)) {
        return
      }

      this.metadataLoadingSources.delete(source)

      for (const meta of metas) {
        this.setTrackLoadState(meta, meta.track === null ? 'idle' : 'ready')

        this.trackMetas.push(meta)
      }

      const firstReadyMeta = metas.find((meta) => meta.track !== null) ?? null
      const firstMeta = firstReadyMeta ?? metas[0] ?? null

      if (this.activeMeta === null && firstMeta !== null) {
        this.activeMeta = firstMeta

        if (firstMeta.track !== null) {
          this.focusedTrack = { track: firstMeta.track, version: Date.now() }
        } else {
          void this.loadTrack(firstMeta)
        }
      }

      this.notify(true)
    } catch (error) {
      this.metadataLoadingSources.delete(source)
      this.removeSource(source)
      this.lastError = error instanceof Error ? error.message : 'Source could not be loaded.'
      this.notify(true)
    }
  }

  public deleteSource(source: TrackSource): void {
    this.removeSource(source)
    this.notify(true)
  }

  public setSourceVisible(source: TrackSource, visible: boolean): void {
    source.visible = visible

    for (const meta of this.sourceMetas(source)) {
      meta.visible = visible
    }

    if (!visible && this.activeMeta?.source === source) {
      this.activeMeta = null
      this.focusedTrack = null
    }

    this.notify(true)

    const firstVisibleMeta = visible
      ? this.sourceMetas(source).find((meta) => meta.visible && meta.track === null) ?? null
      : null

    if (firstVisibleMeta !== null) {
      void this.loadTrack(firstVisibleMeta)
    }
  }

  public setSourceExpanded(source: TrackSource, expanded: boolean): void {
    source.expanded = expanded
    this.notify()
  }

  public setSourceColor(source: TrackSource, color: string): void {
    source.color = color

    for (const meta of this.sourceMetas(source)) {
      meta.color = color
    }

    this.notify(true)
  }

  public moveSource(source: TrackSource, direction: -1 | 1): void {
    const orderedSources = [...this.sources].sort((left, right) => left.order - right.order)
    const currentIndex = orderedSources.indexOf(source)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedSources.length) {
      return
    }

    const nextSource = orderedSources[nextIndex]
    const currentOrder = source.order

    source.order = nextSource.order
    nextSource.order = currentOrder
    this.notify(true)
  }

  public moveSourceToIndex(source: TrackSource, targetIndex: number): void {
    const orderedSources = [...this.sources].sort((left, right) => left.order - right.order)
    const currentIndex = orderedSources.indexOf(source)

    if (currentIndex < 0) {
      return
    }

    const clampedIndex = Math.max(0, Math.min(targetIndex, orderedSources.length - 1))

    orderedSources.splice(currentIndex, 1)
    orderedSources.splice(clampedIndex, 0, source)
    orderedSources.forEach((orderedSource, index) => {
      orderedSource.order = index
    })
    this.notify(true)
  }

  public renameSource(source: TrackSource, name: string): void {
    const normalizedName = name.trim()

    if (normalizedName === '') {
      return
    }

    source.name = normalizedName
    this.notify()
  }

  public setTrackVisible(meta: TrackMeta, visible: boolean): void {
    meta.visible = visible

    if (visible && meta.source !== null) {
      meta.source.visible = true
    }

    if (!visible && this.activeMeta === meta) {
      this.activeMeta = null
      this.focusedTrack = null
    }

    this.notify(true)

    if (visible && meta.track === null) {
      void this.loadTrack(meta)
    }
  }

  public setTrackColor(meta: TrackMeta, color: string): void {
    meta.color = color
    this.notify(true)
  }

  public activateTrack(meta: TrackMeta): void {
    this.activeMeta = meta
    this.notify(true)

    if (meta.track === null) {
      void this.loadTrack(meta)
    }
  }

  public focusTrack(meta: TrackMeta): void {
    this.activeMeta = meta

    if (meta.track !== null) {
      this.focusedTrack = {
        track: meta.track,
        version: (this.focusedTrack?.version ?? 0) + 1,
      }
      this.notify(true)
      return
    }

    this.notify(true)

    void this.loadTrack(meta).then((track) => {
      if (track === null || this.activeMeta !== meta) {
        return
      }

      this.focusedTrack = {
        track,
        version: (this.focusedTrack?.version ?? 0) + 1,
      }

      this.notify(true)
    })
  }

  public retryFailed(source?: TrackSource): void {
    const failedMetas: TrackMeta[] = []

    for (const meta of this.trackMetas) {
      if (
        this.trackLoadState(meta).status !== 'error' ||
        (source !== undefined && meta.source !== source)
      ) {
        continue
      }

      this.setTrackLoadState(meta, 'idle')
      failedMetas.push(meta)
    }

    this.notify()

    for (const meta of failedMetas) {
      void this.loadTrack(meta)
    }
  }

  public loadTrack(meta: TrackMeta): Promise<Track | null> {
    if (meta.track !== null) {
      this.setTrackLoadState(meta, 'ready')
      return Promise.resolve(meta.track)
    }

    const existing = this.loadingTracks.get(meta)

    if (existing !== undefined) {
      return existing
    }

    if (meta.source === null) {
      this.setTrackLoadState(meta, 'error', 'Track source is missing.')
      this.notify()
      return Promise.resolve(null)
    }

    const source = meta.source

    this.setTrackLoadState(meta, 'loading')
    this.notify()

    const promise = source.loadTrack(meta)
      .then((track) => {
        if (this.deletedSources.has(source)) {
          return null
        }

        meta.track = track
        this.setTrackLoadState(meta, 'ready')
        this.notify(true)

        return track
      })
      .catch((error) => {
        if (!this.deletedSources.has(source)) {
          meta.track = null
          this.setTrackLoadState(
            meta,
            'error',
            error instanceof Error ? error.message : 'Track could not be loaded.',
          )
          this.notify()
        }

        return null
      })
      .finally(() => {
        this.loadingTracks.delete(meta)
      })

    this.loadingTracks.set(meta, promise)

    return promise
  }

  public sourceMetas(source: TrackSource): TrackMeta[] {
    return this.trackMetas.filter((meta) => meta.source === source)
  }

  public sourceProgress(source: TrackSource): SourceProgress {
    const metas = this.sourceMetas(source)
    const states = metas.map((meta) => this.trackLoadState(meta))

    return {
      total: metas.length,
      queued: states.filter((state) => state.status === 'idle').length,
      loading: states.filter((state) => state.status === 'loading').length,
      ready: states.filter((state) => state.status === 'ready').length,
      error: states.filter((state) => state.status === 'error').length,
    }
  }

  public trackLoadState(meta: TrackMeta): TrackLoadRuntimeState {
    if (meta.track !== null) {
      return { status: 'ready', error: null }
    }

    return this.trackLoadStates.get(meta) ?? { status: 'idle', error: null }
  }

  public isSourceLoadingMetadata(source: TrackSource): boolean {
    return this.metadataLoadingSources.has(source)
  }

  public visibleTracks(): Track[] {
    return this.visibleTrackMetas()
      .map((meta) => meta.track)
      .filter((track): track is Track => track !== null)
  }

  public visibleTrackMetas(): TrackMeta[] {
    return this.visibleMetasInMapLayerOrder()
      .filter((meta) => meta.track !== null)
  }

  public isLoading(): boolean {
    return (
      this.metadataLoadingSources.size > 0 ||
      this.trackMetas.some((meta) => this.trackLoadState(meta).status === 'loading')
    )
  }

  private removeSource(source: TrackSource): void {
    this.deletedSources.add(source)
    this.metadataLoadingSources.delete(source)

    const sourceIndex = this.sources.indexOf(source)

    if (sourceIndex >= 0) {
      this.sources.splice(sourceIndex, 1)
    }

    for (let index = this.trackMetas.length - 1; index >= 0; index -= 1) {
      if (this.trackMetas[index].source === source) {
        this.trackMetas.splice(index, 1)
      }
    }

    if (this.activeMeta?.source === source) {
      this.activeMeta = null
      this.focusedTrack = null
    }
  }

  private visibleMetasInMapLayerOrder(): TrackMeta[] {
    const orderedSources = [...this.sources].sort((left, right) => right.order - left.order)
    const orderedMetas: TrackMeta[] = []

    for (const source of orderedSources) {
      orderedMetas.push(
        ...this.sourceMetas(source)
          .filter((meta) => meta.visible && meta.source?.visible === true)
          .reverse(),
      )
    }

    return orderedMetas
  }

  private notify(mapChanged = false): void {
    for (const listener of this.listeners) {
      listener({ mapChanged })
    }
  }

  private setTrackLoadState(
    meta: TrackMeta,
    status: TrackLoadRuntimeStatus,
    error: string | null = null,
  ): void {
    this.trackLoadStates.set(meta, { status, error })

    if (status === 'idle') {
      meta.loadStatus = 'queued'
      meta.loadError = null
      return
    }

    meta.loadStatus = status
    meta.loadError = error
  }

  private metaWithoutTrackGeometry(meta: TrackMeta): TrackMeta {
    const restoredStatus = meta.loadStatus === 'loading'
      ? 'queued'
      : meta.track === null
        ? meta.loadStatus
        : 'ready'
    const clone = new TrackMeta(meta.source, meta.remoteId, meta.name, meta.color, {
      visible: meta.visible,
      loadStatus: restoredStatus,
      activityKind: meta.activityKind,
      activityType: meta.activityType,
      difficulty: meta.difficulty,
      dateTime: meta.dateTime,
      sourceUpdatedAt: meta.sourceUpdatedAt,
      distanceMeters: meta.distanceMeters,
      durationSeconds: meta.durationSeconds,
      elevationGainMeters: meta.elevationGainMeters,
      elevationLossMeters: meta.elevationLossMeters,
      description: meta.description,
      src: meta.src,
      trackType: meta.trackType,
      number: meta.number,
      author: meta.author,
      links: meta.links === null ? null : [...meta.links],
      copyright: meta.copyright,
      startPoint: meta.startPoint,
      finishPoint: meta.finishPoint,
    })

    clone.loadError = meta.loadError

    return clone
  }
}
