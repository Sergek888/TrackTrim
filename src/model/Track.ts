import { BaseModel } from './base/BaseModel'
import type { TrackPoint } from './TrackPoint'
import { TrackSegment } from './TrackSegment'
import type { ViewPoint } from './ViewPoint'

export class Track extends BaseModel {
  public static modelType = 'track'

  private readonly segments: readonly TrackSegment[]
  private readonly viewpoints: readonly ViewPoint[]

  public constructor(
    segments: TrackSegment[] = [],
    viewpoints: ViewPoint[] = [],
  ) {
    super()
    this.segments = Object.freeze([...segments])
    this.viewpoints = Object.freeze([...viewpoints])
  }

  public static fromPoints(
    points: TrackPoint[],
    viewpoints?: ViewPoint[],
  ): Track {
    return new Track(
      [new TrackSegment(points)],
      viewpoints ?? [],
    )
  }

  public getSegments(): readonly TrackSegment[] {
    return this.segments
  }

  public segmentsCount(): number {
    return this.segments.length
  }

  public segment(index: number): TrackSegment | null {
    return this.segments[index] ?? null
  }

  public getViewPoints(): readonly ViewPoint[] {
    return this.viewpoints
  }

  public viewpointsCount(): number {
    return this.viewpoints.length
  }

  public getPoints(): readonly TrackPoint[] {
    return this.segments.flatMap((s) => s.getPoints())
  }

  public pointsCount(): number {
    return this.segments.reduce((sum, s) => sum + s.pointsCount(), 0)
  }

  public firstPoint(): TrackPoint | null {
    return this.segments[0]?.firstPoint() ?? null
  }

  public lastPoint(): TrackPoint | null {
    return this.segments[this.segments.length - 1]?.lastPoint() ?? null
  }

  public point(flatIndex: number): TrackPoint | null {
    let offset = 0

    for (const segment of this.segments) {
      if (flatIndex < offset + segment.pointsCount()) {
        return segment.point(flatIndex - offset)
      }

      offset += segment.pointsCount()
    }

    return null
  }

  protected override exportState(): Record<string, unknown> {
    return {
      segments: this.segments,
      viewpoints: this.viewpoints,
    }
  }

  protected override importState(state: Record<string, unknown>): void {
    ;(this as unknown as { segments: readonly TrackSegment[] }).segments =
      Object.freeze([...(state.segments as TrackSegment[] ?? [])])

    ;(this as unknown as { viewpoints: readonly ViewPoint[] }).viewpoints =
      Object.freeze([...(state.viewpoints as ViewPoint[] ?? [])])
  }
}
