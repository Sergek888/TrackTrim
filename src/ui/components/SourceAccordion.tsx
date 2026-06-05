import { useEffect, useMemo, useRef } from 'react'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import { TRACK_COLORS } from '../trackColors'
import TrackListItem from './TrackListItem'

type SourceAccordionProps = {
  source: TrackSource
  tracks: readonly Track[]
  displayedTracks: readonly Track[]
  activeTrack: Track | null
  onSourceVisibilityChange: (source: TrackSource, visible: boolean) => void
  onSourceExpandedChange: (source: TrackSource, expanded: boolean) => void
  onSourceColorChange: (source: TrackSource, color: string) => void
  onMoveSource: (source: TrackSource, direction: -1 | 1) => void
  onDeleteSource: (source: TrackSource) => void
  onTrackActivate: (track: Track) => void
  onTrackFocus: (track: Track) => void
  onTrackVisibilityChange: (track: Track, visible: boolean) => void
  onTrackColorChange: (track: Track, color: string) => void
  onTrackExport: (track: Track) => void
  onTrackDelete: (track: Track) => void
}

export default function SourceAccordion({
  source,
  tracks,
  displayedTracks,
  activeTrack,
  onSourceVisibilityChange,
  onSourceExpandedChange,
  onSourceColorChange,
  onMoveSource,
  onDeleteSource,
  onTrackActivate,
  onTrackFocus,
  onTrackVisibilityChange,
  onTrackColorChange,
  onTrackExport,
  onTrackDelete,
}: SourceAccordionProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null)
  const visibleCount = useMemo(
    () => tracks.filter((track) => track.meta?.visible ?? false).length,
    [tracks],
  )
  const allVisible = tracks.length > 0 && visibleCount === tracks.length
  const partiallyVisible = visibleCount > 0 && visibleCount < tracks.length

  useEffect(() => {
    if (checkboxRef.current !== null) {
      checkboxRef.current.indeterminate = partiallyVisible
    }
  }, [partiallyVisible])

  return (
    <section className="source-accordion">
      <header className="source-row">
        <button className="icon-button" type="button" aria-label="Move source up" onClick={() => onMoveSource(source, -1)}>
          Up
        </button>
        <button className="icon-button" type="button" aria-label="Move source down" onClick={() => onMoveSource(source, 1)}>
          Down
        </button>
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allVisible}
          aria-label={`Toggle ${source.name}`}
          onChange={(event) => onSourceVisibilityChange(source, event.target.checked)}
        />

        <div className="track-color-control">
          <button
            className="track-color-swatch"
            type="button"
            style={{ background: source.color }}
            aria-label={`${source.name} color`}
          />
          <div className="track-color-popover">
            {TRACK_COLORS.map((color) => (
              <button
                key={color}
                className="track-color-option"
                type="button"
                style={{ background: color }}
                aria-label={`Set source color ${color}`}
                onClick={() => onSourceColorChange(source, color)}
              />
            ))}
            <input
              type="color"
              value={source.color}
              aria-label="Custom source color"
              onChange={(event) => onSourceColorChange(source, event.target.value)}
            />
          </div>
        </div>

        <button
          className="source-title"
          type="button"
          onClick={() => onSourceExpandedChange(source, !source.expanded)}
        >
          <span>{source.name}</span>
          <small>{tracks.length}</small>
        </button>

        <button className="icon-button danger" type="button" aria-label="Delete source" onClick={() => onDeleteSource(source)}>
          X
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={source.expanded ? 'Collapse source' : 'Expand source'}
          onClick={() => onSourceExpandedChange(source, !source.expanded)}
        >
          {source.expanded ? '-' : '+'}
        </button>
      </header>

      {source.expanded && (
        <div className="track-list">
          {displayedTracks.length === 0 ? (
            <p className="empty-source">No tracks yet</p>
          ) : (
            displayedTracks.map((track) => (
              <TrackListItem
                key={`${track.meta?.source.name ?? 'source'}:${track.meta?.remoteId ?? displayedTracks.indexOf(track)}`}
                track={track}
                active={track === activeTrack}
                onActivate={onTrackActivate}
                onFocus={onTrackFocus}
                onVisibilityChange={onTrackVisibilityChange}
                onColorChange={onTrackColorChange}
                onExport={onTrackExport}
                onDelete={onTrackDelete}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}
