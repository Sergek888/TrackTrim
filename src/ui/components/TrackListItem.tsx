import { Crosshair } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { Track } from '../../model/Track'
import { formatDistance } from '../formatters'

type TrackListItemProps = {
  track: Track
  active: boolean
  onActivate: (track: Track) => void
  onFocus: (track: Track) => void
  onVisibilityChange: (track: Track, visible: boolean) => void
  onColorClick: (track: Track, left: number, top: number) => void
}

export default function TrackListItem({
  track,
  active,
  onActivate,
  onFocus,
  onVisibilityChange,
  onColorClick,
}: TrackListItemProps) {
  const meta = track.meta

  if (meta === null) {
    return null
  }

  function handleColorClick(event: MouseEvent<HTMLButtonElement>): void {
    const rect = event.currentTarget.getBoundingClientRect()

    onColorClick(track, rect.left - 90, rect.bottom + 10)
  }

  return (
    <article className={`track-list-item${active ? ' is-active' : ''}`}>
      <input
        type="checkbox"
        checked={meta.visible}
        aria-label={`Toggle ${meta.name}`}
        onChange={(event) => onVisibilityChange(track, event.target.checked)}
      />

      <button
        className="color-dot"
        type="button"
        style={{ background: meta.color }}
        aria-label={`${meta.name} color`}
        onClick={handleColorClick}
      />

      <button className="track-main-button" type="button" onClick={() => onActivate(track)}>
        <span>{meta.name}</span>
        <small>
          {formatDistance(track.distanceKm())} | {meta.source.name}
        </small>
      </button>

      <button
        className="focus-button ghost-button"
        type="button"
        aria-label="Focus track"
        onClick={() => onFocus(track)}
      >
        <Crosshair aria-hidden="true" size={15} strokeWidth={2.2} />
      </button>
    </article>
  )
}
