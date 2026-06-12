import { Clock, ExternalLink, Folder, Mountain, Ruler, X } from 'lucide-react'
import type { Track } from '../../model/Track'
import { formatDistance, formatDuration } from '../formatters'

export type TrackTooltipState = {
  track: Track
}

type TrackTooltipProps = {
  tooltip: TrackTooltipState | null
  onClose: () => void
}

export default function TrackTooltip({ tooltip, onClose }: TrackTooltipProps) {
  if (tooltip === null) return null

  const { track } = tooltip
  const meta = track.meta
  const originalUrl = meta?.getOriginalUrl() ?? null
  const elevationGainM = track.elevationGainM()

  return (
    <aside className="track-tooltip" aria-label="Track details">
      <header>
        <div className="tooltip-title">
          <h2>{meta?.name ?? 'Track'}</h2>
        </div>
        <button className="icon-button ghost-button" type="button" aria-label="Close track details" title="Close track details" onClick={onClose}>
          <X aria-hidden="true" size={16} />
        </button>
      </header>

      <p className="tooltip-source"><Folder aria-hidden="true" size={14} />{meta?.source.name ?? 'Unknown source'}</p>

      <div className="tooltip-metrics">
        <span title="Distance"><Ruler aria-hidden="true" size={15} />{formatDistance(track.distanceKm())}</span>
        <i aria-hidden="true" />
        <span title="Elevation gain"><Mountain aria-hidden="true" size={15} />{elevationGainM === null ? 'Unknown' : `${Math.round(elevationGainM)} m`}</span>
        <i aria-hidden="true" />
        <span title="Duration"><Clock aria-hidden="true" size={15} />{formatDuration(track.durationSec())}</span>
      </div>

      {originalUrl !== null && (
        <a
          className="icon-button details-button"
          href={originalUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open original track"
          title="Open original track"
        >
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      )}
    </aside>
  )
}
