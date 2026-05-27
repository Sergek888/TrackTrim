export type TrackPointInput = {
  lat: number
  lon: number
  ele: number | null
  time: Date | null
}

export type TrackPoint = TrackPointInput & {
  elapsedSec: number | null
  distanceFromStartKm: number
}
