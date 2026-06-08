import { useMemo, useState } from 'react'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import AddSourceDialog from './AddSourceDialog'
import ColorPalette from './ColorPalette'
import TrackMap, { type TrackMapPoint } from './TrackMap'
import TrackSidebar from './TrackSidebar'
import TrackTooltip, { type TrackTooltipState } from './TrackTooltip'

type FocusedTrackState = {
  track: Track
  version: number
}

type ColorPaletteState =
  | {
      kind: 'source'
      source: TrackSource
      left: number
      top: number
    }
  | {
      kind: 'track'
      track: Track
      left: number
      top: number
    }

export default function TrackWorkspace() {
  const [sources, setSources] = useState<TrackSource[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [focusedTrack, setFocusedTrack] = useState<FocusedTrackState | null>(null)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false)
  const [isLoadingSource, setIsLoadingSource] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [colorPalette, setColorPalette] = useState<ColorPaletteState | null>(null)
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
        setFocusedTrack({ track: loadedTracks[0], version: Date.now() })
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

  function handleColorPaletteChange(color: string): void {
    if (colorPalette === null) {
      return
    }

    if (colorPalette.kind === 'source') {
      handleSourceColorChange(colorPalette.source, color)
      setColorPalette(null)
      return
    }

    handleTrackColorChange(colorPalette.track, color)
    setColorPalette(null)
  }

  function handleTrackActivate(track: Track): void {
    setActiveTrack(track)
  }

  function handleTrackFocus(track: Track): void {
    setActiveTrack(track)
    setFocusedTrack((current) => ({
      track,
      version: (current?.version ?? 0) + 1,
    }))
    setColorPalette(null)
  }

  function handleMapTrackClick(track: Track, point: TrackMapPoint): void {
    setActiveTrack(track)
    setTooltip({ track, point: { x: point.x, y: point.y } })
    setColorPalette(null)
  }

  return (
    <section className="workspace" aria-label="Track workspace">
      <div className="map-shell">
        <TrackMap
          tracks={visibleTracks}
          activeTrack={activeTrack}
          focusedTrack={focusedTrack}
          onTrackClick={handleMapTrackClick}
          onMapClick={() => {
            setTooltip(null)
            setColorPalette(null)
          }}
        />

        {tracks.length === 0 && (
          <section className="empty-map-state" aria-label="No tracks loaded">
            <h2>Load track sources</h2>
            <p>Add GPX files or a Komoot tour URL to start building the map.</p>
            <button
              className="save-button"
              type="button"
              onClick={() => {
                setTooltip(null)
                setColorPalette(null)
                setIsAddSourceOpen(true)
              }}
            >
              Add source
            </button>
          </section>
        )}

        <TrackTooltip
          tooltip={tooltip}
          sidebarOpen={isSidebarOpen}
          onClose={() => setTooltip(null)}
        />
        {colorPalette !== null && (
          <ColorPalette
            left={colorPalette.left}
            top={colorPalette.top}
            value={
              colorPalette.kind === 'source'
                ? colorPalette.source.color
                : colorPalette.track.meta?.color ?? '#2563eb'
            }
            onChange={handleColorPaletteChange}
          />
        )}

        {errorMessage !== null && (
          <p className="workspace-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <TrackSidebar
        sources={sources}
        tracks={tracks}
        activeTrack={activeTrack}
        searchQuery={searchQuery}
        loading={isLoadingSource}
        collapsed={!isSidebarOpen}
        onSearchChange={setSearchQuery}
        onAddSourceClick={() => {
          setTooltip(null)
          setColorPalette(null)
          setIsAddSourceOpen(true)
        }}
        onToggleCollapsed={() => {
          setIsSidebarOpen((open) => !open)
          setTooltip(null)
          setColorPalette(null)
        }}
        onSourceVisibilityChange={handleSourceVisibilityChange}
        onSourceExpandedChange={handleSourceExpandedChange}
        onSourceColorClick={(source, left, top) => {
          setColorPalette({ kind: 'source', source, left, top })
        }}
        onMoveSource={handleMoveSource}
        onDeleteSource={handleDeleteSource}
        onTrackActivate={handleTrackActivate}
        onTrackFocus={handleTrackFocus}
        onTrackVisibilityChange={handleTrackVisibilityChange}
        onTrackColorClick={(track, left, top) => {
          setColorPalette({ kind: 'track', track, left, top })
        }}
      />

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
