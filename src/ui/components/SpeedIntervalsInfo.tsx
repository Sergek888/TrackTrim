import type { TrackInterval } from '../../model/TrackInterval'
import type { TrackPoint } from '../../model/TrackPoint'
import {
  formatAverageSpeed,
  formatDateTime,
  formatDistance,
  formatDuration,
} from '../formatters'

type SpeedIntervalsInfoProps = {
  intervals: TrackInterval[]
  points: readonly TrackPoint[]
}

export default function SpeedIntervalsInfo({ intervals, points }: SpeedIntervalsInfoProps) {
  const pauseIntervalsCount = intervals.filter((interval) => interval.kind === 'pause').length
  const speedIntervalsCount = intervals.length - pauseIntervalsCount

  return (
    <section className="speed-intervals" aria-label="Speed intervals">
      <h2>Speed intervals</h2>

      {intervals.length === 0 ? (
        <p>No speed intervals found</p>
      ) : (
        <>
          <dl>
            <dt>Total:</dt>
            <dd>{intervals.length}</dd>

            <dt>Speed intervals:</dt>
            <dd>{speedIntervalsCount}</dd>

            <dt>Pauses:</dt>
            <dd>{pauseIntervalsCount}</dd>
          </dl>

          <div className="speed-interval-list">
            {intervals.map((interval) => {
              const startPoint = points[interval.fromIndex] ?? null
              const finishPoint = points[interval.toIndex] ?? null

              return (
                <article
                  className="speed-interval"
                  key={`${interval.fromIndex}-${interval.toIndex}`}
                >
                  <dl>
                    <dt>Type:</dt>
                    <dd>{interval.kind === 'pause' ? 'Pause' : 'Speed'}</dd>

                    <dt>Start time:</dt>
                    <dd>{formatDateTime(startPoint?.time ?? null)}</dd>

                    <dt>Finish time:</dt>
                    <dd>{formatDateTime(finishPoint?.time ?? null)}</dd>

                    <dt>Duration:</dt>
                    <dd>{formatDuration(interval.durationSec)}</dd>

                    <dt>Distance:</dt>
                    <dd>{formatDistance(interval.distanceKm)}</dd>

                    <dt>Average speed:</dt>
                    <dd>{formatAverageSpeed(interval.averageSpeedKmh())}</dd>
                  </dl>
                </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
