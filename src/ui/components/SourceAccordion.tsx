import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, type MouseEvent } from 'react'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import TrackListItem from './TrackListItem'

type SourceAccordionProps = {
  source: TrackSource
  tracks: readonly Track[]
  displayedTracks: readonly Track[]
  activeTrack: Track | null
  canMoveUp: boolean
  canMoveDown: boolean
  onSourceVisibilityChange: (source: TrackSource, visible: boolean) => void
  onSourceExpandedChange: (source: TrackSource, expanded: boolean) => void
  onSourceColorClick: (source: TrackSource, left: number, top: number) => void
  onMoveSource: (source: TrackSource, direction: -1 | 1) => void
  onDeleteSource: (source: TrackSource) => void
  onTrackActivate: (track: Track) => void
  onTrackFocus: (track: Track) => void
  onTrackVisibilityChange: (track: Track, visible: boolean) => void
  onTrackColorClick: (track: Track, left: number, top: number) => void
}

export default function SourceAccordion({
  source,
  tracks,
  displayedTracks,
  activeTrack,
  canMoveUp,
  canMoveDown,
  onSourceVisibilityChange,
  onSourceExpandedChange,
  onSourceColorClick,
  onMoveSource,
  onDeleteSource,
  onTrackActivate,
  onTrackFocus,
  onTrackVisibilityChange,
  onTrackColorClick,
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

  function handleSourceColorClick(event: MouseEvent<HTMLButtonElement>): void {
    const rect = event.currentTarget.getBoundingClientRect()

    onSourceColorClick(source, rect.left - 90, rect.bottom + 10)
  }

  return (
    <section className="source-accordion">
      <header className="source-row">
        <button
          className="icon-button ghost-button"
          type="button"
          aria-label="Move source up"
          disabled={!canMoveUp}
          onClick={() => onMoveSource(source, -1)}
        >
          <ChevronUp aria-hidden="true" size={16} strokeWidth={2.3} />
        </button>
        <button
          className="icon-button ghost-button"
          type="button"
          aria-label="Move source down"
          disabled={!canMoveDown}
          onClick={() => onMoveSource(source, 1)}
        >
          <ChevronDown aria-hidden="true" size={16} strokeWidth={2.3} />
        </button>
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allVisible}
          aria-label={`Toggle ${source.name}`}
          onChange={(event) => onSourceVisibilityChange(source, event.target.checked)}
        />

        <button
          className="color-dot"
          type="button"
          style={{ background: source.color }}
          aria-label={`${source.name} color`}
          onClick={handleSourceColorClick}
        />

        <button
          className="source-title"
          type="button"
          onClick={() => onSourceExpandedChange(source, !source.expanded)}
        >
          <span>{source.name}</span>
          <small>{tracks.length}</small>
        </button>

        <button className="icon-button ghost-button danger source-delete-button" type="button" aria-label="Delete source" onClick={() => onDeleteSource(source)}>
          <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
        <button
          className="icon-button ghost-button"
          type="button"
          aria-label={source.expanded ? 'Collapse source' : 'Expand source'}
          onClick={() => onSourceExpandedChange(source, !source.expanded)}
        >
          {source.expanded ? (
            <Minus aria-hidden="true" size={15} strokeWidth={2.3} />
          ) : (
            <Plus aria-hidden="true" size={15} strokeWidth={2.3} />
          )}
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
                onColorClick={onTrackColorClick}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}
