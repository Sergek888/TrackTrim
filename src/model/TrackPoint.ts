export type TrackPointInput = {
  lat: number
  lon: number
  ele: number | null
  time: Date | null
  elapsedSec?: number | null
}

export type TrackPoint = Omit<TrackPointInput, 'elapsedSec'> & {
  elapsedSec: number | null
  distanceFromStartKm: number
}
