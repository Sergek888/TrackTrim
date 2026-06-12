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
import type { SourceProgress } from '../../application/TrackLibrary'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import TrackListItem from './TrackListItem'

type SourceAccordionProps = {
  source: TrackSource
  sourceIndex: number
  metas: readonly TrackMeta[]
  displayedMetas: readonly TrackMeta[]
  activeMeta: TrackMeta | null
  progress: SourceProgress
  loadingMetadata: boolean
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
    onSourceVisibilityChange, onSourceExpandedChange, onSourceColorClick, onSourceMove,
    onSourceRename, onDeleteSource, onTrackActivate, onTrackFocus, onTrackVisibilityChange,
  } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(source.name)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const visibleCount = useMemo(() => metas.filter((meta) => meta.visible).length, [metas])
  const allVisible = metas.length > 0 && visibleCount === metas.length
  const partiallyVisible = visibleCount > 0 && visibleCount < metas.length

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
            onClick={() => onSourceExpandedChange(source, !source.expanded)}
          >
            <span>{source.name}</span>
          </button>
        )}

        <span className="source-counter">({visibleCount}/{progress.total})</span>
        <div className="source-menu-wrap" ref={menuRef}>
          <button className="icon-button ghost-button source-menu-trigger" type="button" aria-label="Source actions" title="Source actions" onClick={() => setMenuOpen((open) => !open)}>
            <MoreVertical aria-hidden="true" size={16} />
          </button>
          {menuOpen && (
            <div className="source-context-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setRenaming(true) }}><Pencil aria-hidden="true" size={15} />Rename</button>
              <button type="button" role="menuitem" onClick={openColorPalette}><Palette aria-hidden="true" size={15} />Change color</button>
              <button className="danger" type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDeleteSource(source) }}><Trash2 aria-hidden="true" size={15} />Delete</button>
            </div>
          )}
        </div>
        <button className="icon-button ghost-button" type="button" aria-label={source.expanded ? 'Collapse source' : 'Expand source'} title={source.expanded ? 'Collapse source' : 'Expand source'} onClick={() => onSourceExpandedChange(source, !source.expanded)}>
          {source.expanded ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
        </button>
      </header>

      {source.expanded && (
        <div className="track-list">
          {(loadingMetadata || progress.loading > 0 || progress.error > 0) && (
            <p className="source-progress">
              {loadingMetadata ? 'Loading list' : `${progress.ready}/${progress.total} ready`}
              {progress.loading > 0 ? ` · ${progress.loading} loading` : ''}
              {progress.error > 0 ? ` · ${progress.error} errors` : ''}
            </p>
          )}
          {displayedMetas.length === 0 ? <p className="empty-source">No tracks yet</p> : displayedMetas.map((meta) => (
            <TrackListItem key={`${meta.source.name}:${meta.remoteId}`} meta={meta} active={meta === activeMeta} onActivate={onTrackActivate} onFocus={onTrackFocus} onVisibilityChange={onTrackVisibilityChange} />
          ))}
        </div>
      )}
    </section>
  )
}
