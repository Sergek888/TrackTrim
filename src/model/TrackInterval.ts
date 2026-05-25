import type { Track } from './Track'

export class TrackInterval {
  public readonly track: Track
  public readonly fromIndex: number
  public readonly toIndex: number

  public constructor(track: Track, fromIndex: number, toIndex: number) {
    this.track = track
    this.fromIndex = fromIndex
    this.toIndex = toIndex
  }

  public distanceM(): number {
    throw new Error("Not implemented")
  }

  public durationSec(): number {
    throw new Error("Not implemented")
  }

  public averageSpeedKmh(): number {
    throw new Error("Not implemented")
  }
}
