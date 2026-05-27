export type SpeedSegmentationOptions = {
  minSpeedDifferenceKmh: number
  minSegmentDurationSec: number
  minSegmentDistanceKm: number
  minSegmentPoints: number
  pauseWindowDurationSec: number
  pauseMinDurationSec: number
  pauseMaxDistanceKm: number
  pauseMaxAverageSpeedKmh: number
  pauseMergeGapSec: number
  debug: boolean
}

export const DEFAULT_SPEED_SEGMENTATION_OPTIONS: SpeedSegmentationOptions = {
  minSpeedDifferenceKmh: 2,
  minSegmentDurationSec: 60,
  minSegmentDistanceKm: 0.02,
  minSegmentPoints: 5,
  pauseWindowDurationSec: 180,
  pauseMinDurationSec: 120,
  pauseMaxDistanceKm: 0.03,
  pauseMaxAverageSpeedKmh: 1.5,
  pauseMergeGapSec: 60,
  debug: false,
}
