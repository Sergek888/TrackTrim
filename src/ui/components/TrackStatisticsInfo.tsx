import type { TrackStatistics } from '../../model/TrackStatistics'
import {
  formatAverageSpeed,
  formatDateTime,
  formatDistance,
  formatDuration,
} from '../formatters'

type TrackStatisticsInfoProps = {
  statistics: TrackStatistics | null
}

export default function TrackStatisticsInfo({ statistics }: TrackStatisticsInfoProps) {
  return (
    <section className="track-statistics" aria-label="Track statistics">
      <h2>Track statistics</h2>

      {statistics === null ? (
        <p>Insufficient track data</p>
      ) : (
        <dl>
          <dt>Points:</dt>
          <dd>{statistics.pointsCount}</dd>

          <dt>Start:</dt>
          <dd>{formatDateTime(statistics.startTime)}</dd>

          <dt>Finish:</dt>
          <dd>{formatDateTime(statistics.finishTime)}</dd>

          <dt>Duration:</dt>
          <dd>{formatDuration(statistics.durationSec)}</dd>

          <dt>Pauses:</dt>
          <dd>{statistics.pauseCount}</dd>

          <dt>Pause time:</dt>
          <dd>{formatDuration(statistics.pauseDurationSec)}</dd>

          <dt>Moving time:</dt>
          <dd>{formatDuration(statistics.movingDurationSec)}</dd>

          <dt>Distance:</dt>
          <dd>{formatDistance(statistics.distanceKm)}</dd>

          <dt>Average speed:</dt>
          <dd>{formatAverageSpeed(statistics.averageSpeedKmh)}</dd>

          <dt>Moving average speed:</dt>
          <dd>{formatAverageSpeed(statistics.movingAverageSpeedKmh)}</dd>
        </dl>
      )}
    </section>
  )
}
