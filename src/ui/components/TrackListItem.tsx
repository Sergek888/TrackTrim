import { Crosshair, Route, TriangleAlert } from 'lucide-react'
import type { TrackMeta } from '../../model/TrackMeta'
import { formatDistance } from '../formatters'

type TrackListItemProps = {
  meta: TrackMeta
  active: boolean
  onActivate: (meta: TrackMeta) => void
  onFocus: (meta: TrackMeta) => void
  onVisibilityChange: (meta: TrackMeta, visible: boolean) => void
}

export default function TrackListItem({ meta, active, onActivate, onFocus, onVisibilityChange }: TrackListItemProps) {
  const track = meta.track
  const loading = meta.loadStatus === 'queued' || meta.loadStatus === 'loading'

  return (
    <article className={`track-list-item${active ? ' is-active' : ''}`}>
      <input
        className="track-visibility"
        type="checkbox"
        checked={meta.visible}
        style={{ accentColor: meta.color }}
        aria-label={meta.visible ? `Hide ${meta.name}` : `Show ${meta.name}`}
        title={meta.visible ? 'Hide track' : 'Show track'}
        onChange={(event) => onVisibilityChange(meta, event.target.checked)}
      />
      <Route className="track-type-icon" aria-label="Track" size={16} style={{ color: meta.color }} />
      <button className="track-main-button" type="button" onClick={() => onActivate(meta)}>
        <span>{meta.name}</span>
      </button>
      <span className="track-metric">
        {loading ? (
          <span className="loading-spinner" role="status" aria-label={meta.loadStatus === 'queued' ? 'Waiting to load' : 'Loading track'} title={meta.loadStatus === 'queued' ? 'Waiting to load' : 'Loading track'} />
        ) : meta.loadStatus === 'error' ? (
          <span title={meta.loadError ?? 'Track could not be loaded'}>
            <TriangleAlert className="track-error-icon" aria-label="Track loading failed" size={17} />
          </span>
        ) : track !== null ? formatDistance(track.distanceKm()) : null}
      </span>
      <button className="icon-button ghost-button track-focus-button" type="button" aria-label="Zoom to track" title="Zoom to track" disabled={track === null} onClick={() => onFocus(meta)}>
        <Crosshair aria-hidden="true" size={15} />
      </button>
    </article>
  )
}
