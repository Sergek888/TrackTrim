import { TriangleAlert } from 'lucide-react'
import type { TrackLoadRuntimeState } from '../../application/TrackLibrary'
import { type TrackMeta } from '../../model/TrackMeta'
import { computeTotalDistanceMeters } from '../../model/TrackMeta'
import { formatDistance } from '../formatters'
import Spinner from '../shared/Spinner'

type TrackListItemProps = {
  meta: TrackMeta
  loadState: TrackLoadRuntimeState
  active: boolean
  onActivate: (meta: TrackMeta) => void
  onFocus: (meta: TrackMeta) => void
  onVisibilityChange: (meta: TrackMeta, visible: boolean) => void
}

export default function TrackListItem({ meta, loadState, active, onActivate, onFocus, onVisibilityChange }: TrackListItemProps) {
  const track = meta.track
  const loading = loadState.status === 'loading'

  return (
    <article
      className={`track-list-item${active ? ' is-active' : ''}`}
      title={track === null ? undefined : 'Double-click to zoom to track'}
      onDoubleClick={() => {
        if (track !== null) onFocus(meta)
      }}
    >
      <input
        className="track-visibility"
        type="checkbox"
        checked={meta.visible}
        style={{ accentColor: meta.color }}
        aria-label={meta.visible ? `Hide ${meta.name}` : `Show ${meta.name}`}
        title={meta.visible ? 'Hide track' : 'Show track'}
        onChange={(event) => onVisibilityChange(meta, event.target.checked)}
        onDoubleClick={(event) => event.stopPropagation()}
      />
      <button
        className="track-main-button"
        type="button"
        title={meta.name}
        onClick={() => onActivate(meta)}
      >
        <span>{meta.name}</span>
      </button>
      <span className="track-metric">
        {loading ? (
          <Spinner
            label="Loading track"
          />
        ) : loadState.status === 'error' ? (
          <span title={loadState.error ?? 'Track could not be loaded'}>
            <TriangleAlert className="track-error-icon" aria-label="Track loading failed" size={17} />
          </span>
        ) : track !== null ? formatDistance(computeTotalDistanceMeters(track.getPoints()) / 1000) : null}
      </span>
    </article>
  )
}
