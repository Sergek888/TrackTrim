import type { TrackSource } from '../application/sources/TrackSource'
import { BaseModel } from './base/BaseModel'
import type { Track } from './Track'
import type { TrackPoint } from './TrackPoint'

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
  visible?: boolean
  loadStatus?: TrackLoadStatus
  activityKind?: TrackActivityKind | null
  activityType?: TrackActivityType | null
  difficulty?: TrackDifficulty | null
  dateTime?: Date | null
  sourceUpdatedAt?: Date | null
  distanceMeters?: number | null
  durationSeconds?: number | null
  elevationGainMeters?: number | null
  elevationLossMeters?: number | null
  description?: string | null
  name?: string | null
  src?: string | null
  trackType?: string | null
  number?: number | null
  author?: { name?: string; email?: string } | null
  links?: Array<{ href: string; text?: string; mimeType?: string }> | null
  copyright?: { author?: string; year?: number; license?: string } | null
  startPoint?: TrackPoint | null
  finishPoint?: TrackPoint | null
}

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function distanceMetersBetween(from: TrackPoint, to: TrackPoint): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function computeTotalDistanceMeters(points: readonly TrackPoint[]): number {
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    total += distanceMetersBetween(points[index - 1], points[index])
  }

  return total
}

export function computeDurationSeconds(points: readonly TrackPoint[]): number | null {
  const timedPoints = points.filter((point) => point.time !== null)

  if (timedPoints.length < 2) {
    return null
  }

  const first = timedPoints[0].time!.getTime()
  const last = timedPoints[timedPoints.length - 1].time!.getTime()

  return Math.max(0, (last - first) / 1000)
}

export function computeElevationGainMeters(points: readonly TrackPoint[]): number | null {
  let gain = 0
  let hasElevation = false

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1].ele
    const curr = points[index].ele

    if (prev !== null && curr !== null) {
      hasElevation = true
      const delta = curr - prev

      if (delta > 0) {
        gain += delta
      }
    }
  }

  return hasElevation ? gain : null
}

export function computeElevationLossMeters(points: readonly TrackPoint[]): number | null {
  let loss = 0
  let hasElevation = false

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1].ele
    const curr = points[index].ele

    if (prev !== null && curr !== null) {
      hasElevation = true
      const delta = curr - prev

      if (delta < 0) {
        loss += Math.abs(delta)
      }
    }
  }

  return hasElevation ? loss : null
}

export class TrackMeta extends BaseModel {
  public static modelType = 'track-meta'

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
  public description: string | null
  public src: string | null
  public trackType: string | null
  public number: number | null
  public author: { readonly name?: string; readonly email?: string } | null
  public links: ReadonlyArray<{ readonly href: string; readonly text?: string; readonly mimeType?: string }> | null
  public copyright: { readonly author?: string; readonly year?: number; readonly license?: string } | null
  public startPoint: TrackPoint | null
  public finishPoint: TrackPoint | null

  public constructor(
    public readonly source: TrackSource,
    public readonly remoteId: string,
    public name: string,
    public color: string,
    options: TrackMetaOptions = {},
  ) {
    super()
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
    this.description = options.description ?? null
    this.src = options.src ?? null
    this.trackType = options.trackType ?? null
    this.number = options.number ?? null
    this.author = options.author ?? null
    this.links = options.links ?? null
    this.copyright = options.copyright ?? null
    this.startPoint = options.startPoint ?? null
    this.finishPoint = options.finishPoint ?? null
  }

  public fillMissingFromPoints(points: readonly TrackPoint[]): void {
    this.dateTime ??= points.find((point) => point.time !== null)?.time ?? null
    this.distanceMeters ??= computeTotalDistanceMeters(points)
    this.durationSeconds ??= computeDurationSeconds(points)
    this.elevationGainMeters ??= computeElevationGainMeters(points)
    this.elevationLossMeters ??= computeElevationLossMeters(points)
    this.startPoint ??= points[0] ?? null
    this.finishPoint ??= points[points.length - 1] ?? null
  }

  public getOriginalUrl(): string | null {
    return this.source.getOriginalUrl(this)
  }

  public getShareUrl(): string | null {
    return this.source.getShareUrl(this)
  }

  protected override exportState(): Record<string, unknown> {
    return {
      source: this.source,
      remoteId: this.remoteId,
      name: this.name,
      color: this.color,
      visible: this.visible,
      loadStatus: this.loadStatus,
      loadError: this.loadError,
      activityKind: this.activityKind,
      activityType: this.activityType,
      difficulty: this.difficulty,
      dateTime: this.dateTime,
      sourceUpdatedAt: this.sourceUpdatedAt,
      distanceMeters: this.distanceMeters,
      durationSeconds: this.durationSeconds,
      elevationGainMeters: this.elevationGainMeters,
      elevationLossMeters: this.elevationLossMeters,
      description: this.description,
      src: this.src,
      trackType: this.trackType,
      number: this.number,
      author: this.author,
      links: this.links,
      copyright: this.copyright,
      startPoint: this.startPoint,
      finishPoint: this.finishPoint,
      track: this.track,
    }
  }

  protected override importState(state: Record<string, unknown>): void {
    ;(this as unknown as { source: TrackSource }).source = state.source as TrackSource
    ;(this as unknown as { remoteId: string }).remoteId = String(state.remoteId ?? '')
    this.name = String(state.name ?? '')
    this.color = String(state.color ?? '#2563eb')
    this.visible = state.visible !== false
    this.loadStatus = (state.loadStatus as TrackLoadStatus | undefined) ?? 'ready'
    this.loadError = (state.loadError as string | null | undefined) ?? null
    this.activityKind = (state.activityKind as TrackActivityKind | null | undefined) ?? null
    this.activityType = (state.activityType as TrackActivityType | null | undefined) ?? null
    this.difficulty = (state.difficulty as TrackDifficulty | null | undefined) ?? null
    this.dateTime = (state.dateTime as Date | null | undefined) ?? null
    this.sourceUpdatedAt = (state.sourceUpdatedAt as Date | null | undefined) ?? null
    this.distanceMeters = (state.distanceMeters as number | null | undefined) ?? null
    this.durationSeconds = (state.durationSeconds as number | null | undefined) ?? null
    this.elevationGainMeters = (state.elevationGainMeters as number | null | undefined) ?? null
    this.elevationLossMeters = (state.elevationLossMeters as number | null | undefined) ?? null
    this.description = (state.description as string | null | undefined) ?? null
    this.src = (state.src as string | null | undefined) ?? null
    this.trackType = (state.trackType as string | null | undefined) ?? null
    this.number = (state.number as number | null | undefined) ?? null
    this.author = (state.author as { readonly name?: string; readonly email?: string } | null | undefined) ?? null
    this.links = (state.links as ReadonlyArray<{ readonly href: string; readonly text?: string; readonly mimeType?: string }> | null | undefined) ?? null
    this.copyright = (state.copyright as { readonly author?: string; readonly year?: number; readonly license?: string } | null | undefined) ?? null
    this.startPoint = (state.startPoint as TrackPoint | null | undefined) ?? null
    this.finishPoint = (state.finishPoint as TrackPoint | null | undefined) ?? null
    this.track = (state.track as Track | null | undefined) ?? null
  }
}
