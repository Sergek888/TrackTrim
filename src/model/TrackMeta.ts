import type { TrackSource } from '../application/sources/TrackSource'
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
  public description: string | null
  public src: string | null
  public trackType: string | null
  public number: number | null
  public author: { readonly name?: string; readonly email?: string } | null
  public links: ReadonlyArray<{ readonly href: string; readonly text?: string; readonly mimeType?: string }> | null
  public copyright: { readonly author?: string; readonly year?: number; readonly license?: string } | null

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
    this.description = options.description ?? null
    this.src = options.src ?? null
    this.trackType = options.trackType ?? null
    this.number = options.number ?? null
    this.author = options.author ?? null
    this.links = options.links ?? null
    this.copyright = options.copyright ?? null
  }

  public fillMissingFromPoints(points: readonly TrackPoint[]): void {
    this.dateTime ??= points.find((point) => point.time !== null)?.time ?? null
    this.distanceMeters ??= computeTotalDistanceMeters(points)
    this.durationSeconds ??= computeDurationSeconds(points)
    this.elevationGainMeters ??= computeElevationGainMeters(points)
    this.elevationLossMeters ??= computeElevationLossMeters(points)
  }

  public getOriginalUrl(): string | null {
    return this.source.getOriginalUrl(this)
  }

  public getShareUrl(): string | null {
    return this.source.getShareUrl(this)
  }
}
