import type { TrackPoint } from '../../model/TrackPoint'
import { formatNullableNumber, formatPointDate } from '../formatters'

type TrackInfoProps = {
  pointsCount: number
  firstPoint: TrackPoint | null
  lastPoint: TrackPoint | null
}

function TrackPointInfo({ point, title }: { point: TrackPoint; title: string }) {
  return (
    <section className="track-point">
      <h3>{title}</h3>

      <dl>
        <dt>Lat:</dt>
        <dd>{point.lat}</dd>

        <dt>Lon:</dt>
        <dd>{point.lon}</dd>

        <dt>Time:</dt>
        <dd>{formatPointDate(point.time)}</dd>

        <dt>Elevation:</dt>
        <dd>{formatNullableNumber(point.ele)}</dd>
      </dl>
    </section>
  )
}

export default function TrackInfo({ pointsCount, firstPoint, lastPoint }: TrackInfoProps) {
  return (
    <section className="track-info" aria-label="Track information">
      <h2>Track information</h2>

      {pointsCount === 0 ? (
        <p>No track points found</p>
      ) : (
        <>
          <dl>
            <dt>Points:</dt>
            <dd>{pointsCount}</dd>
          </dl>

          {firstPoint !== null && <TrackPointInfo point={firstPoint} title="First point:" />}
          {lastPoint !== null && <TrackPointInfo point={lastPoint} title="Last point:" />}
        </>
      )}
    </section>
  )
}
