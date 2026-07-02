import { BaseModel } from './base/BaseModel'
import type { TrackPoint } from './TrackPoint'

export class TrackSegment extends BaseModel {
  public static modelType = 'track-segment'

  private readonly points: readonly TrackPoint[]

  public constructor(points: TrackPoint[] = []) {
    super()
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

  protected override exportState(): Record<string, unknown> {
    return {
      points: this.points,
    }
  }

  protected override importState(state: Record<string, unknown>): void {
    ;(this as unknown as { points: readonly TrackPoint[] }).points =
      Object.freeze([...(state.points as TrackPoint[] ?? [])])
  }
}
