import { useMemo, useState } from 'react'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import AddSourceDialog from './AddSourceDialog'
import TrackMap, { type TrackMapPoint } from './TrackMap'
import TrackSidebar from './TrackSidebar'
import TrackTooltip, { type TrackTooltipState } from './TrackTooltip'

export default function TrackWorkspace() {
  const [sources, setSources] = useState<TrackSource[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [focusedTrack, setFocusedTrack] = useState<Track | null>(null)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false)
  const [isLoadingSource, setIsLoadingSource] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [renderVersion, setRenderVersion] = useState(0)

  const visibleTracks = useMemo(
    () =>
      tracks
        .filter((track) => track.meta?.visible ?? false)
        .filter((track) => track.meta?.source.visible ?? true),
    [tracks, renderVersion],
  )

  function rerenderWorkspace(): void {
    setRenderVersion((version) => version + 1)
  }

  async function handleSourceCreate(source: TrackSource): Promise<void> {
    setIsAddSourceOpen(false)
    setIsLoadingSource(true)
    setErrorMessage(null)

    try {
      const loadedTracks = await source.loadTracks()

      setSources((currentSources) => [...currentSources, source])
      setTracks((currentTracks) => [...currentTracks, ...loadedTracks])

      if (activeTrack === null && loadedTracks[0] !== undefined) {
        setActiveTrack(loadedTracks[0])
        setFocusedTrack(loadedTracks[0])
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Source could not be loaded.')
    } finally {
      setIsLoadingSource(false)
    }
  }

  function handleSourceVisibilityChange(source: TrackSource, visible: boolean): void {
    source.visible = visible

    for (const track of tracks) {
      if (track.meta?.source === source) {
        track.meta.visible = visible
      }
    }

    if (!visible && activeTrack?.meta?.source === source) {
      setActiveTrack(null)
      setTooltip(null)
    }

    rerenderWorkspace()
  }

  function handleSourceExpandedChange(source: TrackSource, expanded: boolean): void {
    source.expanded = expanded
    rerenderWorkspace()
  }

  function handleSourceColorChange(source: TrackSource, color: string): void {
    source.color = color

    for (const track of tracks) {
      if (track.meta?.source === source) {
        track.meta.color = color
      }
    }

    rerenderWorkspace()
  }

  function handleMoveSource(source: TrackSource, direction: -1 | 1): void {
    const orderedSources = [...sources].sort((left, right) => left.order - right.order)
    const currentIndex = orderedSources.indexOf(source)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedSources.length) {
      return
    }

    const nextSource = orderedSources[nextIndex]
    const currentOrder = source.order

    source.order = nextSource.order
    nextSource.order = currentOrder
    rerenderWorkspace()
  }

  function handleDeleteSource(source: TrackSource): void {
    const sourceTracks = tracks.filter((track) => track.meta?.source === source)

    if (!window.confirm(`Delete source "${source.name}" and ${sourceTracks.length} tracks?`)) {
      return
    }

    setSources((currentSources) => currentSources.filter((item) => item !== source))
    setTracks((currentTracks) => currentTracks.filter((track) => track.meta?.source !== source))

    if (activeTrack?.meta?.source === source) {
      setActiveTrack(null)
      setTooltip(null)
    }
  }

  function handleTrackVisibilityChange(track: Track, visible: boolean): void {
    if (track.meta === null) {
      return
    }

    track.meta.visible = visible

    if (!visible && activeTrack === track) {
      setActiveTrack(null)
      setTooltip(null)
    }

    rerenderWorkspace()
  }

  function handleTrackColorChange(track: Track, color: string): void {
    if (track.meta === null) {
      return
    }

    track.meta.color = color
    rerenderWorkspace()
  }

  function handleTrackActivate(track: Track): void {
    setActiveTrack(track)
  }

  function handleTrackFocus(track: Track): void {
    setActiveTrack(track)
    setFocusedTrack(track)
  }

  async function handleTrackExport(track: Track): Promise<void> {
    const source = track.meta?.source ?? null

    if (source === null) {
      setErrorMessage('Track source is missing.')
      return
    }

    try {
      await source.saveTrack(track, 'gpx')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Track could not be exported.')
    }
  }

  function handleTrackDelete(track: Track): void {
    if (!window.confirm(`Delete track "${track.meta?.name ?? 'Track'}"?`)) {
      return
    }

    setTracks((currentTracks) => currentTracks.filter((item) => item !== track))

    if (activeTrack === track) {
      setActiveTrack(null)
      setTooltip(null)
    }
  }

  function handleMapTrackClick(track: Track, _point: TrackMapPoint): void {
    setActiveTrack(track)
    setTooltip({ track })
  }

  return (
    <section className="workspace" aria-label="Track workspace">
      <div className="map-shell">
        <TrackMap
          tracks={visibleTracks}
          activeTrack={activeTrack}
          focusedTrack={focusedTrack}
          onTrackClick={handleMapTrackClick}
          onMapClick={() => setTooltip(null)}
        />

        {tracks.length === 0 && (
          <section className="empty-map-state" aria-label="No tracks loaded">
            <h2>Load track sources</h2>
            <p>Add GPX files or a Komoot tour URL to start building the map.</p>
            <button className="save-button" type="button" onClick={() => setIsAddSourceOpen(true)}>
              Add source
            </button>
          </section>
        )}

        <TrackTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />

        {errorMessage !== null && (
          <p className="workspace-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <button
        className="sidebar-toggle"
        type="button"
        aria-label={isSidebarOpen ? 'Hide panel' : 'Show panel'}
        onClick={() => setIsSidebarOpen((open) => !open)}
      >
        {isSidebarOpen ? '>' : '<'}
      </button>

      {isSidebarOpen && (
        <TrackSidebar
          sources={sources}
          tracks={tracks}
          activeTrack={activeTrack}
          searchQuery={searchQuery}
          loading={isLoadingSource}
          onSearchChange={setSearchQuery}
          onAddSourceClick={() => setIsAddSourceOpen(true)}
          onSourceVisibilityChange={handleSourceVisibilityChange}
          onSourceExpandedChange={handleSourceExpandedChange}
          onSourceColorChange={handleSourceColorChange}
          onMoveSource={handleMoveSource}
          onDeleteSource={handleDeleteSource}
          onTrackActivate={handleTrackActivate}
          onTrackFocus={handleTrackFocus}
          onTrackVisibilityChange={handleTrackVisibilityChange}
          onTrackColorChange={handleTrackColorChange}
          onTrackExport={(track) => {
            void handleTrackExport(track)
          }}
          onTrackDelete={handleTrackDelete}
        />
      )}

      {isAddSourceOpen && (
        <AddSourceDialog
          sourceIndex={sources.length}
          onCancel={() => setIsAddSourceOpen(false)}
          onCreate={(source) => {
            void handleSourceCreate(source)
          }}
        />
      )}
    </section>
  )
}
