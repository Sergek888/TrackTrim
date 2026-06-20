export type TrackPointExtensions = {
  heartRate?: number
  cadence?: number
  temperature?: number
  power?: number
  custom?: Record<string, string>
}

export type TrackPoint = {
  lat: number
  lon: number
  ele: number | null
  time: Date | null
  extensions?: TrackPointExtensions
}
