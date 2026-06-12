import { PanelRightClose, PanelRightOpen, Plus, Search, Settings, X } from 'lucide-react'
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
  onSettingsClick: () => void
  onToggleCollapsed: () => void
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
  loading,
  collapsed,
  onSearchChange,
  onAddSourceClick,
  onSettingsClick,
  onToggleCollapsed,
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
    <>
      <button
        className="sidebar-toggle"
        type="button"
        aria-label={collapsed ? 'Open navigation panel' : 'Close navigation panel'}
        title={collapsed ? 'Open navigation panel' : 'Close navigation panel'}
        onClick={onToggleCollapsed}
      >
        {collapsed ? <PanelRightOpen aria-hidden="true" /> : <PanelRightClose aria-hidden="true" />}
      </button>

      <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Track sources">
        <header className="sidebar-header">
          <div className="app-brand">
            <h1>GPS Track Navigator</h1>
          </div>
          <button
            className="icon-button ghost-button sidebar-settings-button"
            type="button"
            aria-label="Settings"
            title="Settings"
            onClick={onSettingsClick}
          >
            <Settings aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="sidebar-controls">
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
          <button
            className="icon-button add-source-button"
            type="button"
            aria-label="Add source"
            title="Add source"
            onClick={onAddSourceClick}
          >
            <Plus aria-hidden="true" size={16} />
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
      </aside>
    </>
  )
}
