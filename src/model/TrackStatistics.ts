export type TrackStatistics = {
  pointsCount: number
  startTime: Date | null
  finishTime: Date | null
  durationSec: number | null
  pauseCount: number
  pauseDurationSec: number
  movingDurationSec: number | null
  distanceKm: number
  averageSpeedKmh: number | null
  movingAverageSpeedKmh: number | null
}
