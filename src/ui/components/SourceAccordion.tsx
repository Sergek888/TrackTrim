import {
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Minus,
  MoreVertical,
  Palette,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent } from 'react'
import type { SourceProgress, TrackLoadRuntimeState } from '../../application/TrackLibrary'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import IconButton from '../shared/IconButton'
import TrackListItem from './TrackListItem'

const INITIAL_TRACK_RENDER_COUNT = 40
const TRACK_RENDER_BATCH_SIZE = 40

type SourceAccordionProps = {
  source: TrackSource
  sourceIndex: number
  metas: readonly TrackMeta[]
  displayedMetas: readonly TrackMeta[]
  activeMeta: TrackMeta | null
  progress: SourceProgress
  loadingMetadata: boolean
  getTrackLoadState: (meta: TrackMeta) => TrackLoadRuntimeState
  onSourceVisibilityChange: (source: TrackSource, visible: boolean) => void
  onSourceExpandedChange: (source: TrackSource, expanded: boolean) => void
  onSourceColorClick: (source: TrackSource, left: number, top: number) => void
  onSourceMove: (sourceOrder: number, targetIndex: number) => void
  onSourceRename: (source: TrackSource, name: string) => void
  onDeleteSource: (source: TrackSource) => void
  onTrackActivate: (meta: TrackMeta) => void
  onTrackFocus: (meta: TrackMeta) => void
  onTrackVisibilityChange: (meta: TrackMeta, visible: boolean) => void
}

export default function SourceAccordion(props: SourceAccordionProps) {
  const {
    source, sourceIndex, metas, displayedMetas, activeMeta, progress, loadingMetadata,
    getTrackLoadState,
    onSourceVisibilityChange, onSourceExpandedChange, onSourceColorClick, onSourceMove,
    onSourceRename, onDeleteSource, onTrackActivate, onTrackFocus, onTrackVisibilityChange,
  } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(source.name)
  const [expanded, setExpanded] = useState(source.expanded)
  const [renderLimit, setRenderLimit] = useState(INITIAL_TRACK_RENDER_COUNT)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const visibleCount = useMemo(() => metas.filter((meta) => meta.visible).length, [metas])
  const allVisible = metas.length > 0 && visibleCount === metas.length
  const partiallyVisible = visibleCount > 0 && visibleCount < metas.length

  useEffect(() => {
    setExpanded(source.expanded)
  }, [source])

  useEffect(() => {
    if (!expanded) {
      setRenderLimit(INITIAL_TRACK_RENDER_COUNT)
      return
    }

    setRenderLimit(Math.min(INITIAL_TRACK_RENDER_COUNT, displayedMetas.length))
  }, [displayedMetas.length, expanded])

  useEffect(() => {
    if (!expanded || renderLimit >= displayedMetas.length) {
      return
    }

    const timerId = window.setTimeout(() => {
      setRenderLimit((currentLimit) =>
        Math.min(currentLimit + TRACK_RENDER_BATCH_SIZE, displayedMetas.length),
      )
    }, 16)

    return () => window.clearTimeout(timerId)
  }, [displayedMetas.length, expanded, renderLimit])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [menuOpen])

  function openColorPalette(event: MouseEvent<HTMLButtonElement>): void {
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuOpen(false)
    onSourceColorClick(source, rect.left - 100, rect.bottom + 8)
  }

  function commitRename(): void {
    if (draftName.trim() !== '') onSourceRename(source, draftName)
    setDraftName(source.name)
    setRenaming(false)
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault()
    const draggedOrder = Number(event.dataTransfer.getData('text/source-order'))
    if (!Number.isNaN(draggedOrder) && draggedOrder !== source.order) {
      onSourceMove(draggedOrder, sourceIndex)
    }
  }

  function handleExpandedChange(nextExpanded: boolean): void {
    setExpanded(nextExpanded)
    onSourceExpandedChange(source, nextExpanded)
  }

  const renderedMetas = expanded
    ? displayedMetas.slice(0, renderLimit)
    : []

  return (
    <section
      className="source-accordion"
      data-source-index={sourceIndex}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <header className="source-row">
        <span
          className="source-drag-handle"
          title="Drag to reorder source"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/source-order', String(source.order))
          }}
        >
          <GripVertical aria-hidden="true" size={16} />
        </span>
        <button
          className={`source-visibility${allVisible ? ' is-all-visible' : ''}${partiallyVisible ? ' is-partial' : ''}`}
          type="button"
          style={{ '--source-color': source.color } as CSSProperties}
          aria-label={visibleCount > 0 ? `Hide ${source.name}` : `Show ${source.name}`}
          title={visibleCount > 0 ? 'Hide source tracks' : 'Show source tracks'}
          onClick={() => onSourceVisibilityChange(source, !allVisible)}
        >
          {allVisible ? <Check aria-hidden="true" size={13} /> : partiallyVisible ? <Minus aria-hidden="true" size={13} /> : null}
        </button>

        {renaming ? (
          <input
            className="source-rename-input"
            value={draftName}
            autoFocus
            aria-label="Source name"
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename()
              if (event.key === 'Escape') {
                setDraftName(source.name)
                setRenaming(false)
              }
            }}
          />
        ) : (
          <button
            className="source-title"
            type="button"
            title={source.name}
            onClick={() => handleExpandedChange(!expanded)}
          >
            <span>{source.name}</span>
          </button>
        )}

        <span className="source-counter">({visibleCount}/{progress.total})</span>
        <div className="source-menu-wrap" ref={menuRef}>
          <IconButton className="source-menu-trigger" variant="ghost" type="button" aria-label="Source actions" title="Source actions" onClick={() => setMenuOpen((open) => !open)}>
            <MoreVertical aria-hidden="true" size={16} />
          </IconButton>
          {menuOpen && (
            <div className="surface source-context-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setRenaming(true) }}><Pencil aria-hidden="true" size={15} />Rename</button>
              <button type="button" role="menuitem" onClick={openColorPalette}><Palette aria-hidden="true" size={15} />Change color</button>
              <button className="danger" type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDeleteSource(source) }}><Trash2 aria-hidden="true" size={15} />Delete</button>
            </div>
          )}
        </div>
        <IconButton variant="ghost" type="button" aria-label={expanded ? 'Collapse source' : 'Expand source'} title={expanded ? 'Collapse source' : 'Expand source'} onClick={() => handleExpandedChange(!expanded)}>
          {expanded ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
        </IconButton>
      </header>

      {expanded && (
        <div className="track-list">
          {(loadingMetadata || progress.loading > 0 || progress.error > 0) && (
            <p className="source-progress">
              {loadingMetadata ? 'Loading list' : `${progress.ready}/${progress.total} ready`}
              {progress.loading > 0 ? ` · ${progress.loading} loading` : ''}
              {progress.error > 0 ? ` · ${progress.error} errors` : ''}
            </p>
          )}
          {displayedMetas.length === 0 ? <p className="empty-source">No tracks yet</p> : renderedMetas.map((meta) => (
            <TrackListItem key={`${meta.source?.name ?? source.name}:${meta.remoteId}`} meta={meta} loadState={getTrackLoadState(meta)} active={meta === activeMeta} onActivate={onTrackActivate} onFocus={onTrackFocus} onVisibilityChange={onTrackVisibilityChange} />
          ))}
        </div>
      )}
    </section>
  )
}
