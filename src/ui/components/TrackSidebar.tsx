import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import SourceAccordion from './SourceAccordion'

type TrackSidebarProps = {
  sources: readonly TrackSource[]
  tracks: readonly Track[]
  activeTrack: Track | null
  searchQuery: string
  loading: boolean
  onSearchChange: (value: string) => void
  onAddSourceClick: () => void
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
  onSearchChange,
  onAddSourceClick,
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
}: TrackSidebarProps) {
  const orderedSources = [...sources].sort((left, right) => left.order - right.order)

  return (
    <aside className="sidebar" aria-label="Track sources">
      <header className="sidebar-header">
        <div className="app-brand">
          <h1>TrackTrim</h1>
          <p>GPS track workspace</p>
        </div>
        <button className="save-button" type="button" onClick={onAddSourceClick}>
          Add source
        </button>
      </header>

      <label className="search-control">
        <span>Search</span>
        <input
          type="search"
          value={searchQuery}
          placeholder="Track or source"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {loading && <p className="status-message">Loading source...</p>}

      <div className="source-list">
        {orderedSources.length === 0 ? (
          <section className="sidebar-empty">
            <h2>No sources</h2>
            <p>Add GPX files or a Komoot tour URL.</p>
          </section>
        ) : (
          orderedSources.map((source) => {
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
                displayedTracks={
                  source.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                    ? sourceTracks
                    : displayedTracks
                }
                activeTrack={activeTrack}
                onSourceVisibilityChange={onSourceVisibilityChange}
                onSourceExpandedChange={onSourceExpandedChange}
                onSourceColorChange={onSourceColorChange}
                onMoveSource={onMoveSource}
                onDeleteSource={onDeleteSource}
                onTrackActivate={onTrackActivate}
                onTrackFocus={onTrackFocus}
                onTrackVisibilityChange={onTrackVisibilityChange}
                onTrackColorChange={onTrackColorChange}
                onTrackExport={onTrackExport}
                onTrackDelete={onTrackDelete}
              />
            )
          })
        )}
      </div>
    </aside>
  )
}
