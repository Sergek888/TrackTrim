export type TrackIntervalKind = 'speed' | 'pause'

export class TrackInterval {
  public readonly fromIndex: number
  public readonly toIndex: number
  public readonly durationSec: number
  public readonly distanceKm: number
  public readonly kind: TrackIntervalKind

  private readonly segmentSpeedsKmh: readonly number[]

  public constructor({
    fromIndex,
    toIndex,
    durationSec,
    distanceKm,
    kind = 'speed',
    segmentSpeedsKmh,
  }: {
    fromIndex: number
    toIndex: number
    durationSec: number
    distanceKm: number
    kind?: TrackIntervalKind
    segmentSpeedsKmh: number[]
  }) {
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.durationSec = durationSec
    this.distanceKm = distanceKm
    this.kind = kind
    this.segmentSpeedsKmh = [...segmentSpeedsKmh]
  }

  public averageSpeedKmh(): number {
    if (this.kind === 'pause') {
      return 0
    }

    if (this.durationSec <= 0) {
      return 0
    }

    return this.distanceKm / (this.durationSec / 3600)
  }

  public maxSpeedKmh(): number {
    if (this.segmentSpeedsKmh.length === 0) {
      return 0
    }

    return Math.max(...this.segmentSpeedsKmh)
  }
}
