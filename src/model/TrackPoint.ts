export class TrackPoint {
  public readonly id: string
  public readonly lat: number
  public readonly lon: number
  public readonly ele: number | null
  public readonly time: Date

  public constructor(id: string, lat: number, lon: number, ele: number | null, time: Date) {
    this.id = id
    this.lat = lat
    this.lon = lon
    this.ele = ele
    this.time = time
  }

  public distanceTo(_point: TrackPoint): number {
    throw new Error("Not implemented")
  }

  public secondsTo(_point: TrackPoint): number {
    throw new Error("Not implemented")
  }

  public speedTo(_point: TrackPoint): number {
    throw new Error("Not implemented")
  }
}
