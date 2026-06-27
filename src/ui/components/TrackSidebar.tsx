import { Plus, Search, X } from 'lucide-react'
import type { TrackLibrary } from '../../application/TrackLibrary'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import EmptyState from '../shared/EmptyState'
import Panel from '../shared/Panel'
import SourceAccordion from './SourceAccordion'

type TrackSidebarProps = {
  library: TrackLibrary
  searchQuery: string
  onSearchChange: (value: string) => void
  onAddSourceClick: () => void
  onClose: () => void
  onSourceVisibilityChange: (source: TrackSource, visible: boolean) => void
  onSourceExpandedChange: (source: TrackSource, expanded: boolean) => void
  onSourceColorClick: (source: TrackSource, left: number, top: number) => void
  onSourceMove: (source: TrackSource, targetIndex: number) => void
  onSourceRename: (source: TrackSource, name: string) => void
  onDeleteSource: (source: TrackSource) => void
  onTrackActivate: (meta: TrackMeta) => void
  onTrackFocus: (meta: TrackMeta) => void
  onTrackVisibilityChange: (meta: TrackMeta, visible: boolean) => void
}

function trackMatchesQuery(meta: TrackMeta, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  return normalizedQuery === '' ||
    meta.name.toLowerCase().includes(normalizedQuery) ||
    meta.source.name.toLowerCase().includes(normalizedQuery)
}

export default function TrackSidebar({
  library,
  searchQuery,
  onSearchChange,
  onAddSourceClick,
  onClose,
  onSourceVisibilityChange,
  onSourceExpandedChange,
  onSourceColorClick,
  onSourceMove,
  onSourceRename,
  onDeleteSource,
  onTrackActivate,
  onTrackFocus,
  onTrackVisibilityChange,
}: TrackSidebarProps) {
  const orderedSources = [...library.sources].sort((left, right) => left.order - right.order)

  return (
    <Panel
      id="track-sidebar"
      title="TrackViewer"
      ariaLabel="Track sources"
      onClose={onClose}
      closeLabel="Close tracks"
      headerActions={
        <button
          className="sidebar-action-button"
          type="button"
          aria-label="Add source"
          title="Add source"
          onClick={onAddSourceClick}
        >
          <Plus aria-hidden="true" />
        </button>
      }
    >
      {orderedSources.length > 0 && (
        <label className="search-control">
          <Search aria-hidden="true" size={16} />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search tracks and sources..."
            aria-label="Search tracks and sources"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery !== '' && (
            <button
              className="search-clear"
              type="button"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => onSearchChange('')}
            >
              <X aria-hidden="true" size={15} />
            </button>
          )}
        </label>
      )}

      <div className="source-list">
        {orderedSources.length === 0 ? (
          <EmptyState heading="No sources">
            <p>Add GPX files or a Komoot tour URL.</p>
          </EmptyState>
        ) : (
          orderedSources.map((source, index) => {
            const sourceMetas = library.sourceMetas(source)
            const displayedMetas = sourceMetas.filter((meta) =>
              trackMatchesQuery(meta, searchQuery),
            )
            const sourceMatches = source.name
              .toLowerCase()
              .includes(searchQuery.trim().toLowerCase())

            if (searchQuery.trim() !== '' && displayedMetas.length === 0 && !sourceMatches) {
              return null
            }

            return (
              <SourceAccordion
                key={`${source.name}:${source.order}`}
                source={source}
                sourceIndex={index}
                metas={sourceMetas}
                displayedMetas={sourceMatches ? sourceMetas : displayedMetas}
                activeMeta={library.activeMeta}
                progress={library.sourceProgress(source)}
                loadingMetadata={library.isSourceLoadingMetadata(source)}
                onSourceVisibilityChange={onSourceVisibilityChange}
                onSourceExpandedChange={onSourceExpandedChange}
                onSourceColorClick={onSourceColorClick}
                onSourceMove={(sourceOrder, targetIndex) => {
                  const draggedSource = orderedSources.find((candidate) => candidate.order === sourceOrder)
                  if (draggedSource !== undefined) onSourceMove(draggedSource, targetIndex)
                }}
                onSourceRename={onSourceRename}
                onDeleteSource={onDeleteSource}
                onTrackActivate={onTrackActivate}
                onTrackFocus={onTrackFocus}
                onTrackVisibilityChange={onTrackVisibilityChange}
              />
            )
          })
        )}
      </div>
    </Panel>
  )
}
