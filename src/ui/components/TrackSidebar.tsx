import { Menu, Plus } from 'lucide-react'
import type { TrackLibrary } from '../../application/TrackLibrary'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import SourceAccordion from './SourceAccordion'

type TrackSidebarProps = {
  library: TrackLibrary
  searchQuery: string
  loading: boolean
  collapsed: boolean
  onSearchChange: (value: string) => void
  onAddSourceClick: () => void
  onToggleCollapsed: () => void
  onSourceVisibilityChange: (source: TrackSource, visible: boolean) => void
  onSourceExpandedChange: (source: TrackSource, expanded: boolean) => void
  onSourceColorClick: (source: TrackSource, left: number, top: number) => void
  onMoveSource: (source: TrackSource, direction: -1 | 1) => void
  onDeleteSource: (source: TrackSource) => void
  onTrackActivate: (meta: TrackMeta) => void
  onTrackFocus: (meta: TrackMeta) => void
  onTrackVisibilityChange: (meta: TrackMeta, visible: boolean) => void
  onTrackColorClick: (meta: TrackMeta, left: number, top: number) => void
}

function trackMatchesQuery(meta: TrackMeta, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (normalizedQuery === '') {
    return true
  }

  return (
    meta.name.toLowerCase().includes(normalizedQuery) ||
    meta.source.name.toLowerCase().includes(normalizedQuery)
  )
}

export default function TrackSidebar({
  library,
  searchQuery,
  loading,
  collapsed,
  onSearchChange,
  onAddSourceClick,
  onToggleCollapsed,
  onSourceVisibilityChange,
  onSourceExpandedChange,
  onSourceColorClick,
  onMoveSource,
  onDeleteSource,
  onTrackActivate,
  onTrackFocus,
  onTrackVisibilityChange,
  onTrackColorClick,
}: TrackSidebarProps) {
  const orderedSources = [...library.sources].sort((left, right) => left.order - right.order)

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Track sources">
      <button
        className="sidebar-toggle"
        type="button"
        aria-label={collapsed ? 'Show panel' : 'Hide panel'}
        onClick={onToggleCollapsed}
      >
        <Menu aria-hidden="true" size={20} strokeWidth={2.4} />
      </button>

      <header className="sidebar-header">
        <div className="app-brand">
            <h1>GPS Track Navigator</h1>
            <p>Sources to nested tracks. Source order controls map layer order.</p>
        </div>
      </header>

      <label className="search-control">
        <input
          type="search"
          value={searchQuery}
          placeholder="Search by track name..."
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <div className="filter-row">
        <select className="select-control" aria-label="Region filter">
          <option>All regions</option>
        </select>
        <button className="save-button" type="button" onClick={onAddSourceClick}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.4} />
          Add source
        </button>
      </div>

      {loading && <p className="status-message">Loading tracks in background...</p>}

      <div className="source-list">
        {orderedSources.length === 0 ? (
          <section className="sidebar-empty">
            <h2>No sources</h2>
            <p>Add GPX files or a Komoot tour URL.</p>
          </section>
        ) : (
          orderedSources.map((source, index) => {
            const sourceMetas = library.sourceMetas(source)
            const displayedMetas = sourceMetas.filter((meta) =>
              trackMatchesQuery(meta, searchQuery),
            )

            if (
              searchQuery.trim() !== '' &&
              displayedMetas.length === 0 &&
              !source.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            ) {
              return null
            }

            return (
              <SourceAccordion
                key={`${source.name}:${source.order}`}
                source={source}
                metas={sourceMetas}
                canMoveUp={index > 0}
                canMoveDown={index < orderedSources.length - 1}
                displayedMetas={
                  source.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                    ? sourceMetas
                    : displayedMetas
                }
                activeMeta={library.activeMeta}
                progress={library.sourceProgress(source)}
                loadingMetadata={library.isSourceLoadingMetadata(source)}
                onSourceVisibilityChange={onSourceVisibilityChange}
                onSourceExpandedChange={onSourceExpandedChange}
                onSourceColorClick={onSourceColorClick}
                onMoveSource={onMoveSource}
                onDeleteSource={onDeleteSource}
                onTrackActivate={onTrackActivate}
                onTrackFocus={onTrackFocus}
                onTrackVisibilityChange={onTrackVisibilityChange}
                onTrackColorClick={onTrackColorClick}
              />
            )
          })
        )}
      </div>
    </aside>
  )
}
