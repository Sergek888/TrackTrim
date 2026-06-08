import { ExternalLink, X } from 'lucide-react'
import type { Track } from '../../model/Track'
import {
  formatAverageSpeed,
  formatDateTime,
  formatDistance,
  formatDuration,
} from '../formatters'

export type TrackTooltipState = {
  track: Track
  point: {
    x: number
    y: number
  }
}

type TrackTooltipProps = {
  tooltip: TrackTooltipState | null
  sidebarOpen: boolean
  onClose: () => void
}

function tooltipPosition(point: { x: number; y: number }, sidebarOpen: boolean): {
  left: number
  top: number
} {
  const width = 250
  const height = 220
  const margin = 14
  const sidebarLeft = sidebarOpen ? window.innerWidth - 378 : window.innerWidth
  let left = point.x + margin
  let top = point.y + margin

  if (left + width > sidebarLeft) {
    left = Math.max(margin, sidebarLeft - width - margin)
  }

  if (top + height > window.innerHeight) {
    top = Math.max(margin, window.innerHeight - height - margin)
  }

  return { left, top }
}

export default function TrackTooltip({ tooltip, sidebarOpen, onClose }: TrackTooltipProps) {
  if (tooltip === null) {
    return null
  }

  const { track } = tooltip
  const meta = track.meta
  const statistics = track.statistics()
  const originalUrl = meta?.getOriginalUrl() ?? null
  const position = tooltipPosition(tooltip.point, sidebarOpen)

  return (
    <aside
      className="track-tooltip"
      style={{ left: position.left, top: position.top }}
      aria-label="Track details"
    >
      <header>
        <h2>{meta?.name ?? 'Track'}</h2>
        <button className="icon-button ghost-button" type="button" aria-label="Close tooltip" onClick={onClose}>
          <X aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
      </header>

      <p className="tooltip-source">{meta?.source.name ?? 'Unknown'}</p>

      <div className="tooltip-metrics">
        <div className="tooltip-metric">
          <b>{formatDistance(track.distanceKm())}</b>
          <span>Distance</span>
        </div>
        <div className="tooltip-metric">
          <b>{formatDuration(track.durationSec())}</b>
          <span>Duration</span>
        </div>
        <div className="tooltip-metric">
          <b>{formatAverageSpeed(track.averageSpeedKmh())}</b>
          <span>Avg speed</span>
        </div>
        <div className="tooltip-metric">
          <b>{formatDateTime(statistics?.startTime ?? null)}</b>
          <span>Start</span>
        </div>
      </div>

      {originalUrl !== null && (
        <a className="details-button" href={originalUrl} target="_blank" rel="noreferrer">
          Original
          <ExternalLink aria-hidden="true" size={14} strokeWidth={2.2} />
        </a>
      )}
    </aside>
  )
}
