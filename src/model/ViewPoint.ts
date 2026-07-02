import { BaseModel } from './base/BaseModel'

export class ViewPoint extends BaseModel {
  public static modelType = 'view-point'

  public constructor(
    public lat: number = 0,
    public lon: number = 0,
    public ele: number | null = null,
    public time: Date | null = null,
    public name: string | null = null,
    public description: string | null = null,
    public comment: string | null = null,
    public symbol: string | null = null,
    public type: string | null = null,
  ) {
    super()
  }
}
