import type { TrackPoint } from './TrackPoint'

export class TrackSegment {
  private readonly points: readonly TrackPoint[]

  public constructor(points: TrackPoint[]) {
    this.points = Object.freeze([...points])
  }

  public getPoints(): readonly TrackPoint[] {
    return this.points
  }

  public pointsCount(): number {
    return this.points.length
  }

  public firstPoint(): TrackPoint | null {
    return this.points[0] ?? null
  }

  public lastPoint(): TrackPoint | null {
    return this.points[this.points.length - 1] ?? null
  }

  public point(index: number): TrackPoint | null {
    return this.points[index] ?? null
  }
}
