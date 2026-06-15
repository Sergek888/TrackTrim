import type { TrackSource } from '../application/sources/TrackSource'
import type { Track } from './Track'

export type TrackLoadStatus = 'queued' | 'loading' | 'ready' | 'error'

export enum TrackActivityKind {
  Planned = 'planned',
  Recorded = 'recorded',
}

export enum TrackActivityType {
  Hiking = 'hiking',
  Running = 'running',
  TouringCycling = 'touring-cycling',
  MountainBiking = 'mountain-biking',
  RoadCycling = 'road-cycling',
  EasyMountainBiking = 'easy-mountain-biking',
  AdvancedMountainBiking = 'advanced-mountain-biking',
  Mountaineering = 'mountaineering',
  Climbing = 'climbing',
  DownhillMountainBiking = 'downhill-mountain-biking',
  Unicycling = 'unicycling',
  CrossCountrySkiing = 'cross-country-skiing',
  NordicWalking = 'nordic-walking',
  InlineSkating = 'inline-skating',
  AlpineSkiing = 'alpine-skiing',
  SkiTouring = 'ski-touring',
  Sledding = 'sledding',
  Snowboarding = 'snowboarding',
  Snowshoeing = 'snowshoeing',
  Bikepacking = 'bikepacking',
  ElectricTouringCycling = 'electric-touring-cycling',
  ElectricMountainBiking = 'electric-mountain-biking',
  ElectricRoadCycling = 'electric-road-cycling',
  EasyElectricMountainBiking = 'easy-electric-mountain-biking',
  AdvancedElectricMountainBiking = 'advanced-electric-mountain-biking',
  Other = 'other',
}

export enum TrackDifficultyLevel {
  Easy = 'easy',
  Moderate = 'moderate',
  Difficult = 'difficult',
}

export type TrackDifficulty = {
  readonly overall: TrackDifficultyLevel | null
  readonly technical: TrackDifficultyLevel | null
  readonly physical: TrackDifficultyLevel | null
}

export type TrackMetaOptions = {
  readonly visible?: boolean
  readonly loadStatus?: TrackLoadStatus
  readonly activityKind?: TrackActivityKind | null
  readonly activityType?: TrackActivityType | null
  readonly difficulty?: TrackDifficulty | null
  readonly dateTime?: Date | null
  readonly sourceUpdatedAt?: Date | null
  readonly distanceMeters?: number | null
  readonly durationSeconds?: number | null
  readonly elevationGainMeters?: number | null
  readonly elevationLossMeters?: number | null
}

export class TrackMeta {
  public track: Track | null = null
  public loadError: string | null = null
  public visible: boolean
  public loadStatus: TrackLoadStatus
  public activityKind: TrackActivityKind | null
  public activityType: TrackActivityType | null
  public difficulty: TrackDifficulty | null
  public dateTime: Date | null
  public sourceUpdatedAt: Date | null
  public distanceMeters: number | null
  public durationSeconds: number | null
  public elevationGainMeters: number | null
  public elevationLossMeters: number | null

  public constructor(
    public readonly source: TrackSource,
    public readonly remoteId: string,
    public name: string,
    public color: string,
    options: TrackMetaOptions = {},
  ) {
    this.visible = options.visible ?? true
    this.loadStatus = options.loadStatus ?? 'ready'
    this.activityKind = options.activityKind ?? null
    this.activityType = options.activityType ?? null
    this.difficulty = options.difficulty ?? null
    this.dateTime = options.dateTime ?? null
    this.sourceUpdatedAt = options.sourceUpdatedAt ?? null
    this.distanceMeters = options.distanceMeters ?? null
    this.durationSeconds = options.durationSeconds ?? null
    this.elevationGainMeters = options.elevationGainMeters ?? null
    this.elevationLossMeters = options.elevationLossMeters ?? null
  }

  public getOriginalUrl(): string | null {
    return this.source.getOriginalUrl(this)
  }

  public getShareUrl(): string | null {
    return this.source.getShareUrl(this)
  }
}
