import type { Track } from '../../model/Track'
import {
  formatAverageSpeed,
  formatDateTime,
  formatDistance,
  formatDuration,
} from '../formatters'

export type TrackTooltipState = {
  track: Track
}

type TrackTooltipProps = {
  tooltip: TrackTooltipState | null
  onClose: () => void
}

export default function TrackTooltip({ tooltip, onClose }: TrackTooltipProps) {
  if (tooltip === null) {
    return null
  }

  const { track } = tooltip
  const meta = track.meta
  const statistics = track.statistics()
  const originalUrl = meta?.getOriginalUrl() ?? null

  return (
    <aside className="track-tooltip" aria-label="Track details">
      <header>
        <h2>{meta?.name ?? 'Track'}</h2>
        <button className="icon-button" type="button" aria-label="Close tooltip" onClick={onClose}>
          X
        </button>
      </header>

      <dl>
        <dt>Source</dt>
        <dd>{meta?.source.name ?? 'Unknown'}</dd>

        <dt>Distance</dt>
        <dd>{formatDistance(track.distanceKm())}</dd>

        <dt>Duration</dt>
        <dd>{formatDuration(track.durationSec())}</dd>

        <dt>Average speed</dt>
        <dd>{formatAverageSpeed(track.averageSpeedKmh())}</dd>

        <dt>Start</dt>
        <dd>{formatDateTime(statistics?.startTime ?? null)}</dd>
      </dl>

      {originalUrl !== null && (
        <a href={originalUrl} target="_blank" rel="noreferrer">
          Original
        </a>
      )}
    </aside>
  )
}
