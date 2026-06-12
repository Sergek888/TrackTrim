import type { Track } from '../model/Track'
import type { TrackMeta } from '../model/TrackMeta'
import type { TrackSource } from './sources/TrackSource'

export type SourceProgress = {
  total: number
  queued: number
  loading: number
  ready: number
  error: number
}

type FocusedTrackState = {
  track: Track
  version: number
}

type Listener = () => void

const MAX_PARALLEL_TRACK_LOADS = 3

export class TrackLibrary {
  public readonly sources: TrackSource[] = []
  public readonly trackMetas: TrackMeta[] = []
  public activeMeta: TrackMeta | null = null
  public focusedTrack: FocusedTrackState | null = null
  public lastError: string | null = null

  private readonly listeners = new Set<Listener>()
  private readonly deletedSources = new Set<TrackSource>()
  private readonly metadataLoadingSources = new Set<TrackSource>()
  private activeLoadCount = 0
  private roundRobinSourceIndex = 0

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  public async addSource(source: TrackSource): Promise<void> {
    this.lastError = null
    this.sources.push(source)
    this.metadataLoadingSources.add(source)
    this.notify()

    try {
      const metas = await source.loadTrackMetas()

      if (this.deletedSources.has(source)) {
        return
      }

      this.metadataLoadingSources.delete(source)

      for (const meta of metas) {
        if (meta.track !== null) {
          meta.loadStatus = 'ready'
        }

        this.trackMetas.push(meta)
      }

      const firstReadyTrack = metas.find((meta) => meta.track !== null)?.track ?? null

      if (this.activeMeta === null && firstReadyTrack !== null && firstReadyTrack.meta !== null) {
        this.activeMeta = firstReadyTrack.meta
        this.focusedTrack = { track: firstReadyTrack, version: Date.now() }
      }

      this.notify()
      this.pumpQueue()
    } catch (error) {
      this.metadataLoadingSources.delete(source)
      this.removeSource(source)
      this.lastError = error instanceof Error ? error.message : 'Source could not be loaded.'
      this.notify()
    }
  }

  public deleteSource(source: TrackSource): void {
    this.removeSource(source)
    this.notify()
    this.pumpQueue()
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

    this.notify()

    if (visible) {
      this.pumpQueue()
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

    this.notify()
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
    this.notify()
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
    this.notify()
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

    if (visible) {
      meta.source.visible = true
    }

    if (!visible && this.activeMeta === meta) {
      this.activeMeta = null
      this.focusedTrack = null
    }

    this.notify()

    if (visible) {
      this.pumpQueue()
    }
  }

  public setTrackColor(meta: TrackMeta, color: string): void {
    meta.color = color
    this.notify()
  }

  public activateTrack(meta: TrackMeta): void {
    this.activeMeta = meta
    this.notify()
    this.pumpQueue()
  }

  public focusTrack(meta: TrackMeta): void {
    this.activeMeta = meta

    if (meta.track !== null) {
      this.focusedTrack = {
        track: meta.track,
        version: (this.focusedTrack?.version ?? 0) + 1,
      }
    }

    this.notify()
    this.pumpQueue()
  }

  public retryFailed(source?: TrackSource): void {
    for (const meta of this.trackMetas) {
      if (meta.loadStatus !== 'error' || (source !== undefined && meta.source !== source)) {
        continue
      }

      meta.loadStatus = 'queued'
      meta.loadError = null
    }

    this.notify()
    this.pumpQueue()
  }

  public sourceMetas(source: TrackSource): TrackMeta[] {
    return this.trackMetas.filter((meta) => meta.source === source)
  }

  public sourceProgress(source: TrackSource): SourceProgress {
    const metas = this.sourceMetas(source)

    return {
      total: metas.length,
      queued: metas.filter((meta) => meta.loadStatus === 'queued').length,
      loading: metas.filter((meta) => meta.loadStatus === 'loading').length,
      ready: metas.filter((meta) => meta.loadStatus === 'ready').length,
      error: metas.filter((meta) => meta.loadStatus === 'error').length,
    }
  }

  public isSourceLoadingMetadata(source: TrackSource): boolean {
    return this.metadataLoadingSources.has(source)
  }

  public visibleTracks(): Track[] {
    return this.visibleMetasInMapLayerOrder()
      .map((meta) => meta.track)
      .filter((track): track is Track => track !== null)
  }

  public isLoading(): boolean {
    return (
      this.metadataLoadingSources.size > 0 ||
      this.activeLoadCount > 0 ||
      this.trackMetas.some((meta) => meta.loadStatus === 'queued' || meta.loadStatus === 'loading')
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
          .filter((meta) => meta.visible && meta.source.visible)
          .reverse(),
      )
    }

    return orderedMetas
  }

  private pumpQueue(): void {
    while (this.activeLoadCount < MAX_PARALLEL_TRACK_LOADS) {
      const meta = this.pickNextMeta()

      if (meta === null) {
        return
      }

      void this.loadQueuedMeta(meta)
    }
  }

  private async loadQueuedMeta(meta: TrackMeta): Promise<void> {
    meta.loadStatus = 'loading'
    meta.loadError = null
    this.activeLoadCount += 1
    this.notify()

    try {
      const track = await meta.source.loadTrack(meta)

      if (!this.deletedSources.has(meta.source)) {
        meta.track = track
        meta.loadStatus = 'ready'
      }
    } catch (error) {
      if (!this.deletedSources.has(meta.source)) {
        meta.track = null
        meta.loadStatus = 'error'
        meta.loadError = error instanceof Error ? error.message : 'Track could not be loaded.'
      }
    } finally {
      this.activeLoadCount = Math.max(0, this.activeLoadCount - 1)
      this.notify()
      this.pumpQueue()
    }
  }

  private pickNextMeta(): TrackMeta | null {
    const activeQueuedMeta =
      this.activeMeta?.loadStatus === 'queued' && !this.deletedSources.has(this.activeMeta.source)
        ? this.activeMeta
        : null

    if (activeQueuedMeta !== null) {
      return activeQueuedMeta
    }

    const orderedSources = [...this.sources].sort((left, right) => left.order - right.order)

    if (orderedSources.length === 0) {
      return null
    }

    for (let offset = 0; offset < orderedSources.length; offset += 1) {
      const sourceIndex = (this.roundRobinSourceIndex + offset) % orderedSources.length
      const source = orderedSources[sourceIndex]
      const nextMeta = this.trackMetas.find(
        (meta) =>
          meta.source === source &&
          meta.loadStatus === 'queued' &&
          !this.deletedSources.has(meta.source),
      )

      if (nextMeta !== undefined) {
        this.roundRobinSourceIndex = (sourceIndex + 1) % orderedSources.length
        return nextMeta
      }
    }

    return null
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
