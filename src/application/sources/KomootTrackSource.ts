import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import {
  TrackActivityKind,
  TrackActivityType,
  TrackDifficultyLevel,
  TrackMeta,
  type TrackDifficulty,
} from '../../model/TrackMeta'
import type { TrackPointInput } from '../../model/TrackPoint'
import {
  type KomootApi,
  type KomootCoordinate,
  type KomootDifficulty,
  type KomootDifficultyLevel as KomootDifficultyLevelDto,
  type KomootSport,
  type KomootTarget,
  type KomootTourSummary,
  type KomootUserListType,
} from '../../komoot/KomootApi'
import { downloadTextFile } from '../download/downloadTextFile'
import type { TrackFormat, TrackLoadCallback, TrackSource } from './TrackSource'

export type { KomootUserListType } from '../../komoot/KomootApi'

export class KomootTrackSource implements TrackSource {
  public visible = true
  public expanded = true
  public order = 0

  private readonly target: KomootTarget
  private readonly komootApi: KomootApi
  private readonly summaries = new WeakMap<TrackMeta, KomootTourSummary>()

  public constructor(
    public readonly url: string,
    public name: string,
    public color: string,
    userListType: KomootUserListType = 'planned',
    komootApi: KomootApi,
  ) {
    const target = komootApi.urls.parse(url, { userListType })

    if (target === null) {
      throw new Error('Komoot tour, collection, profile URL, or user id is invalid.')
    }

    this.target = target
    this.komootApi = komootApi
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

    const track = new TrackModel(points.map((point) => this.trackPointInput(point)), meta)

    meta.track = track
    meta.fillMissingCalculated(track)

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

  public async saveTrack(track: Track, format: TrackFormat): Promise<void> {
    if (format !== 'gpx') {
      throw new Error('Only GPX export is supported.')
    }

    const meta = track.meta
    const payload = gpxConverter.serialize(track.getPoints(), meta?.name ?? 'Komoot tour')

    if (typeof payload.data !== 'string') {
      throw new Error('GPX payload must be text.')
    }

    downloadTextFile(
      payload.data,
      this.gpxFileName(meta?.name ?? 'komoot-tour'),
      payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
    )
  }

  public getOriginalUrl(meta: TrackMeta): string | null {
    return this.komootApi.urls.getTourUrl(meta.remoteId)
  }

  public getShareUrl(meta: TrackMeta): string | null {
    return this.komootApi.urls.getTourShareUrl(meta.remoteId)
  }

  private createMetaFromSummary(summary: KomootTourSummary): TrackMeta {
    const hasGeometry = summary.coordinates !== null && summary.coordinates.length > 0
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
      },
    )

    this.summaries.set(meta, summary)

    if (hasGeometry) {
      const points = summary.coordinates?.map((point) => this.trackPointInput(point)) ?? []
      const track = new TrackModel(points, meta)

      meta.track = track
      meta.fillMissingCalculated(track)
    }

    return meta
  }

  private trackPointInput(point: KomootCoordinate): TrackPointInput {
    return {
      lat: point.lat,
      lon: point.lon,
      ele: point.elevation,
      time: point.time,
      elapsedSec: point.elapsedSeconds,
    }
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
}
