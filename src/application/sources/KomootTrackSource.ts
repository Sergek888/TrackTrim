import { gpxConverter } from '../../formats/gpx/GpxConverter'
import { BaseModel } from '../../model/base/BaseModel'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import {
  TrackActivityKind,
  TrackActivityType,
  TrackDifficultyLevel,
  TrackMeta,
  type TrackDifficulty,
} from '../../model/TrackMeta'
import { TrackPoint } from '../../model/TrackPoint'
import {
  type KomootApi,
  type KomootCoordinate,
  type KomootDifficulty,
  type KomootDifficultyLevel as KomootDifficultyLevelDto,
  type KomootSport,
  type KomootTarget,
  type KomootTourSummary,
} from '../../komoot/KomootApi'
import { downloadTextFile } from '../download/downloadTextFile'
import { getKomootApi } from '../komoot/getKomootApi'
import type { TrackFormat, TrackLoadCallback, TrackSource } from './TrackSource'

export type { KomootUserListType } from '../../komoot/KomootApi'

export type KomootTrackSourceOptions = {
  readonly url: string
  readonly name: string
  readonly color: string
  readonly visible?: boolean
  readonly expanded?: boolean
  readonly order?: number
}

export class KomootTrackSource extends BaseModel implements TrackSource {
  public static modelType = 'komoot-track-source'

  public visible = true
  public expanded = true
  public order = 0
  public url = ''
  public name = ''
  public color = '#2563eb'

  private target!: KomootTarget
  private komootApi!: KomootApi
  private summaries = new WeakMap<TrackMeta, KomootTourSummary>()

  public constructor(options?: KomootTrackSourceOptions) {
    super()

    if (options === undefined) {
      return
    }

    this.url = options.url
    this.name = options.name
    this.color = options.color
    this.visible = options.visible ?? true
    this.expanded = options.expanded ?? true
    this.order = options.order ?? 0
    this.initializeRuntime()
  }

  public static getTargetType(
    url: string,
    komootApi: KomootApi,
  ): 'tour' | 'collection' | 'user' | null {
    return komootApi.urls.getTargetType(url)
  }

  public async loadTrackMetas(): Promise<TrackMeta[]> {
    if (this.target.kind === 'user') {
      const displayName = await this.komootApi.users.getDisplayName(this.target.id)
      const sourceName = displayName === null
        ? null
        : `${displayName} ${this.target.listType === 'planned' ? 'planned' : 'completed'}`

      if (sourceName !== null) {
        this.name = sourceName
      }
    }

    const summaries = (await this.komootApi.import.importTarget(this.target)).tracks

    if (summaries.length === 0 && this.target.kind === 'collection') {
      throw new Error('Komoot collection has no public tours or could not be read.')
    }

    return summaries.map((summary) => this.createMetaFromSummary(summary))
  }

  public async loadTrack(meta: TrackMeta): Promise<Track> {
    if (meta.track !== null) {
      return meta.track
    }

    const summary = this.summaries.get(meta) ?? await this.komootApi.tours.getSummary(meta.remoteId)
    const points = await this.komootApi.tours.getCoordinates(summary)

    if (points.length === 0) {
      throw new Error(`Komoot tour ${meta.remoteId} has no public coordinates.`)
    }

    if (summary.name !== null && summary.name.trim() !== '') {
      meta.name = summary.name
    }

    meta.loadStatus = 'ready'
    meta.loadError = null

    const track = TrackModel.fromPoints(points.map((point) => this.trackPoint(point)))

    meta.track = track
    meta.fillMissingFromPoints(track.getPoints())

    return track
  }

  public async loadTracks(onTrackLoaded?: TrackLoadCallback): Promise<Track[]> {
    const metas = await this.loadTrackMetas()
    const tracks: Track[] = []

    for (const meta of metas) {
      const track = await this.loadTrack(meta)

      tracks.push(track)
      onTrackLoaded?.(track)
    }

    return tracks
  }

  public async saveTrack(meta: TrackMeta, format: TrackFormat): Promise<void> {
    if (format !== 'gpx') {
      throw new Error('Only GPX export is supported.')
    }

    if (meta.track === null) {
      throw new Error('Track is not loaded.')
    }

    const payload = gpxConverter.serialize(meta.track, meta.name)

    if (typeof payload.data !== 'string') {
      throw new Error('GPX payload must be text.')
    }

    downloadTextFile(
      payload.data,
      this.gpxFileName(meta.name),
      payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
    )
  }

  public exportState(): Record<string, unknown> {
    return {
      url: this.url,
      name: this.name,
      color: this.color,
      visible: this.visible,
      expanded: this.expanded,
      order: this.order,
    }
  }

  protected override importState(state: Record<string, unknown>): void {
    this.url = String(state.url ?? '')
    this.name = String(state.name ?? '')
    this.color = String(state.color ?? '#2563eb')
    this.visible = state.visible !== false
    this.expanded = state.expanded !== false
    this.order = typeof state.order === 'number' ? state.order : 0
  }

  public override afterDeserialize(): void {
    this.initializeRuntime()
  }

  public getOriginalUrl(meta: TrackMeta): string | null {
    return this.komootApi.urls.getTourUrl(meta.remoteId)
  }

  public getShareUrl(meta: TrackMeta): string | null {
    return this.komootApi.urls.getTourShareUrl(meta.remoteId)
  }

  private createMetaFromSummary(summary: KomootTourSummary): TrackMeta {
    const hasGeometry = summary.coordinates !== null && summary.coordinates.length > 0
    const firstCoord = hasGeometry ? summary.coordinates![0] : null
    const lastCoord = hasGeometry ? summary.coordinates![summary.coordinates!.length - 1] : null
    const meta = new TrackMeta(
      this,
      summary.id,
      summary.name ?? `Komoot tour ${summary.id}`,
      this.color,
      {
        activityKind: summary.kind === 'planned'
          ? TrackActivityKind.Planned
          : summary.kind === 'recorded'
            ? TrackActivityKind.Recorded
            : null,
        activityType: this.activityType(summary.sport),
        difficulty: this.difficulty(summary.difficulty),
        dateTime: summary.date,
        sourceUpdatedAt: summary.changedAt,
        distanceMeters: summary.distanceMeters,
        durationSeconds: summary.durationSeconds,
        elevationGainMeters: summary.elevationUpMeters,
        elevationLossMeters: summary.elevationDownMeters,
        loadStatus: hasGeometry ? 'ready' : 'queued',
        startPoint: firstCoord ? this.trackPoint(firstCoord) : null,
        finishPoint: lastCoord ? this.trackPoint(lastCoord) : null,
      },
    )

    this.summaries.set(meta, summary)

    if (hasGeometry) {
      const points = summary.coordinates?.map((point) => this.trackPoint(point)) ?? []
      const track = TrackModel.fromPoints(points)

      meta.track = track
      meta.fillMissingFromPoints(track.getPoints())
    }

    return meta
  }

  private trackPoint(point: KomootCoordinate): TrackPoint {
    return new TrackPoint(point.lat, point.lon, point.elevation, point.time)
  }


  private activityType(sport: KomootSport | null): TrackActivityType | null {
    switch (sport) {
      case 'hike':
        return TrackActivityType.Hiking
      case 'jogging':
        return TrackActivityType.Running
      case 'touringbicycle':
        return TrackActivityType.TouringCycling
      case 'mtb':
        return TrackActivityType.MountainBiking
      case 'racebike':
        return TrackActivityType.RoadCycling
      case 'mtb_easy':
        return TrackActivityType.EasyMountainBiking
      case 'mtb_advanced':
        return TrackActivityType.AdvancedMountainBiking
      case 'mountaineering':
        return TrackActivityType.Mountaineering
      case 'climbing':
        return TrackActivityType.Climbing
      case 'downhillbike':
        return TrackActivityType.DownhillMountainBiking
      case 'unicycle':
        return TrackActivityType.Unicycling
      case 'nordic':
        return TrackActivityType.CrossCountrySkiing
      case 'nordicwalking':
        return TrackActivityType.NordicWalking
      case 'skaten':
        return TrackActivityType.InlineSkating
      case 'skialpin':
        return TrackActivityType.AlpineSkiing
      case 'skitour':
        return TrackActivityType.SkiTouring
      case 'sled':
        return TrackActivityType.Sledding
      case 'snowboard':
        return TrackActivityType.Snowboarding
      case 'snowshoe':
        return TrackActivityType.Snowshoeing
      case 'bikepacking':
        return TrackActivityType.Bikepacking
      case 'e_touringbicycle':
        return TrackActivityType.ElectricTouringCycling
      case 'e_mtb':
        return TrackActivityType.ElectricMountainBiking
      case 'e_racebike':
        return TrackActivityType.ElectricRoadCycling
      case 'e_mtb_easy':
        return TrackActivityType.EasyElectricMountainBiking
      case 'e_mtb_advanced':
        return TrackActivityType.AdvancedElectricMountainBiking
      case 'other':
        return TrackActivityType.Other
      case null:
        return null
    }
  }

  private difficulty(value: KomootDifficulty | null): TrackDifficulty | null {
    if (value === null) {
      return null
    }

    return {
      overall: this.difficultyLevel(value.overall),
      technical: this.difficultyLevel(value.technical),
      physical: this.difficultyLevel(value.physical),
    }
  }

  private difficultyLevel(value: KomootDifficultyLevelDto | null): TrackDifficultyLevel | null {
    switch (value) {
      case 'easy':
        return TrackDifficultyLevel.Easy
      case 'moderate':
        return TrackDifficultyLevel.Moderate
      case 'difficult':
        return TrackDifficultyLevel.Difficult
      case null:
        return null
    }
  }

  private gpxFileName(name: string): string {
    const baseName = name.trim().replace(/\.gpx$/i, '').replace(/[<>:"/\\|?*]+/g, '-')

    return `${baseName || 'komoot-tour'}.gpx`
  }

  private initializeRuntime(): void {
    const komootApi = getKomootApi()
    const target = komootApi.urls.parse(this.url)

    if (target === null) {
      throw new Error('Komoot tour, collection, profile URL, or user id is invalid.')
    }

    this.komootApi = komootApi
    this.target = target
    this.summaries = new WeakMap<TrackMeta, KomootTourSummary>()
  }
}
