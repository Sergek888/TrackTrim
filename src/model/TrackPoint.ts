import { BaseModel } from './base/BaseModel'

export type TrackPointExtensions = {
  heartRate?: number
  cadence?: number
  temperature?: number
  power?: number
  custom?: Record<string, string>
}

export class TrackPoint extends BaseModel {
  public static modelType = 'track-point'

  public constructor(
    public lat: number = 0,
    public lon: number = 0,
    public ele: number | null = null,
    public time: Date | null = null,
    public extensions?: TrackPointExtensions,
  ) {
    super()
  }
}
