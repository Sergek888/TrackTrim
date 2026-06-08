import { Menu, Plus } from 'lucide-react'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import SourceAccordion from './SourceAccordion'

type TrackSidebarProps = {
  sources: readonly TrackSource[]
  tracks: readonly Track[]
  activeTrack: Track | null
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
  onTrackActivate: (track: Track) => void
  onTrackFocus: (track: Track) => void
  onTrackVisibilityChange: (track: Track, visible: boolean) => void
  onTrackColorClick: (track: Track, left: number, top: number) => void
}

function trackMatchesQuery(track: Track, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (normalizedQuery === '') {
    return true
  }

  const meta = track.meta

  return (
    meta?.name.toLowerCase().includes(normalizedQuery) ||
    meta?.source.name.toLowerCase().includes(normalizedQuery) ||
    false
  )
}

export default function TrackSidebar({
  sources,
  tracks,
  activeTrack,
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
  const orderedSources = [...sources].sort((left, right) => left.order - right.order)

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

      {loading && <p className="status-message">Loading source...</p>}

      <div className="source-list">
        {orderedSources.length === 0 ? (
          <section className="sidebar-empty">
            <h2>No sources</h2>
            <p>Add GPX files or a Komoot tour URL.</p>
          </section>
        ) : (
          orderedSources.map((source, index) => {
            const sourceTracks = tracks.filter((track) => track.meta?.source === source)
            const displayedTracks = sourceTracks.filter((track) =>
              trackMatchesQuery(track, searchQuery),
            )

            if (
              searchQuery.trim() !== '' &&
              displayedTracks.length === 0 &&
              !source.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            ) {
              return null
            }

            return (
              <SourceAccordion
                key={`${source.name}:${source.order}`}
                source={source}
                tracks={sourceTracks}
                canMoveUp={index > 0}
                canMoveDown={index < orderedSources.length - 1}
                displayedTracks={
                  source.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                    ? sourceTracks
                    : displayedTracks
                }
                activeTrack={activeTrack}
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
