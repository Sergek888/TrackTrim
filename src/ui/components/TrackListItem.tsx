import type { Track } from '../../model/Track'
import { formatDistance } from '../formatters'
import { TRACK_COLORS } from '../trackColors'

type TrackListItemProps = {
  track: Track
  active: boolean
  onActivate: (track: Track) => void
  onFocus: (track: Track) => void
  onVisibilityChange: (track: Track, visible: boolean) => void
  onColorChange: (track: Track, color: string) => void
  onExport: (track: Track) => void
  onDelete: (track: Track) => void
}

export default function TrackListItem({
  track,
  active,
  onActivate,
  onFocus,
  onVisibilityChange,
  onColorChange,
  onExport,
  onDelete,
}: TrackListItemProps) {
  const meta = track.meta

  if (meta === null) {
    return null
  }

  return (
    <article className={`track-list-item${active ? ' is-active' : ''}`}>
      <input
        type="checkbox"
        checked={meta.visible}
        aria-label={`Toggle ${meta.name}`}
        onChange={(event) => onVisibilityChange(track, event.target.checked)}
      />

      <div className="track-color-control">
        <button
          className="track-color-swatch"
          type="button"
          style={{ background: meta.color }}
          aria-label={`${meta.name} color`}
        />
        <div className="track-color-popover">
          {TRACK_COLORS.map((color) => (
            <button
              key={color}
              className="track-color-option"
              type="button"
              style={{ background: color }}
              aria-label={`Set color ${color}`}
              onClick={() => onColorChange(track, color)}
            />
          ))}
          <input
            type="color"
            value={meta.color}
            aria-label="Custom color"
            onChange={(event) => onColorChange(track, event.target.value)}
          />
        </div>
      </div>

      <button className="track-main-button" type="button" onClick={() => onActivate(track)}>
        <span>{meta.name}</span>
        <small>{formatDistance(track.distanceKm())}</small>
      </button>

      <button className="icon-button" type="button" aria-label="Focus track" onClick={() => onFocus(track)}>
        Focus
      </button>

      <button className="icon-button" type="button" aria-label="Export GPX" onClick={() => onExport(track)}>
        GPX
      </button>

      <button className="icon-button danger" type="button" aria-label="Delete track" onClick={() => onDelete(track)}>
        X
      </button>
    </article>
  )
}
