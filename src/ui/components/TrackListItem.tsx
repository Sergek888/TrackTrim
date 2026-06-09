import { Crosshair } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { TrackMeta } from '../../model/TrackMeta'
import { formatDistance } from '../formatters'

type TrackListItemProps = {
  meta: TrackMeta
  active: boolean
  onActivate: (meta: TrackMeta) => void
  onFocus: (meta: TrackMeta) => void
  onVisibilityChange: (meta: TrackMeta, visible: boolean) => void
  onColorClick: (meta: TrackMeta, left: number, top: number) => void
}

export default function TrackListItem({
  meta,
  active,
  onActivate,
  onFocus,
  onVisibilityChange,
  onColorClick,
}: TrackListItemProps) {
  const track = meta.track
  const details =
    meta.loadStatus === 'ready' && track !== null
      ? `${formatDistance(track.distanceKm())} | ${meta.source.name}`
      : meta.loadStatus === 'error'
        ? meta.loadError ?? 'Track could not be loaded'
        : meta.loadStatus === 'loading'
          ? 'Loading geometry...'
          : 'Queued for loading'

  function handleColorClick(event: MouseEvent<HTMLButtonElement>): void {
    const rect = event.currentTarget.getBoundingClientRect()

    onColorClick(meta, rect.left - 90, rect.bottom + 10)
  }

  return (
    <article className={`track-list-item${active ? ' is-active' : ''}`}>
      <input
        type="checkbox"
        checked={meta.visible}
        aria-label={`Toggle ${meta.name}`}
        onChange={(event) => onVisibilityChange(meta, event.target.checked)}
      />

      <button
        className="color-dot"
        type="button"
        style={{ background: meta.color }}
        aria-label={`${meta.name} color`}
        onClick={handleColorClick}
      />

      <button className="track-main-button" type="button" onClick={() => onActivate(meta)}>
        <span>{meta.name}</span>
        <small>{details}</small>
      </button>

      <button
        className="focus-button ghost-button"
        type="button"
        aria-label="Focus track"
        disabled={track === null}
        onClick={() => onFocus(meta)}
      >
        <Crosshair aria-hidden="true" size={15} strokeWidth={2.2} />
      </button>
    </article>
  )
}
