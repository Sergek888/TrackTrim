import type { TrackInterval } from './TrackInterval'
import type { TrackPoint } from './TrackPoint'

export class Track {
  public readonly points: TrackPoint[]

  public constructor(points: TrackPoint[]) {
    this.points = points
  }

  public pointAt(_index: number): TrackPoint {
    throw new Error("Not implemented")
  }

  public distanceM(): number {
    throw new Error("Not implemented")
  }

  public durationSec(): number {
    throw new Error("Not implemented")
  }

  public interval(_fromIndex: number, _toIndex: number): TrackInterval {
    throw new Error("Not implemented")
  }

  public cutAfter(_index: number): Track {
    throw new Error("Not implemented")
  }
}
