import { useEffect, useMemo, useState } from 'react'
import { TrackLibrary } from '../../application/TrackLibrary'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import type { TrackMeta } from '../../model/TrackMeta'
import AddSourceDialog from './AddSourceDialog'
import ColorPalette from './ColorPalette'
import SettingsDialog from './SettingsDialog'
import TrackMap, { type TrackMapPoint } from './TrackMap'
import TrackSidebar from './TrackSidebar'
import TrackTooltip, { type TrackTooltipState } from './TrackTooltip'
import type { KomootConnection } from './sources/KomootConnectDialog'

type ColorPaletteState =
  | {
      kind: 'source'
      source: TrackSource
      left: number
      top: number
    }
  | {
      kind: 'track'
      meta: TrackMeta
      left: number
      top: number
    }

export default function TrackWorkspace() {
  const [library] = useState(() => new TrackLibrary())
  const [libraryVersion, setLibraryVersion] = useState(0)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [komootConnection, setKomootConnection] = useState<KomootConnection>({
    connected: false,
  })
  const [colorPalette, setColorPalette] = useState<ColorPaletteState | null>(null)

  useEffect(
    () => library.subscribe(() => setLibraryVersion((version) => version + 1)),
    [library],
  )

  useEffect(() => {
    void refreshKomootConnection()

    const handleExpired = () => {
      setKomootConnection({ connected: false, expired: true })
    }

    window.addEventListener('tracktrim:komoot-expired', handleExpired)

    return () => window.removeEventListener('tracktrim:komoot-expired', handleExpired)
  }, [])

  const visibleTracks = useMemo(
    () => library.visibleTracks(),
    [library, libraryVersion],
  )
  const activeTrack = library.activeMeta?.track ?? null

  async function refreshKomootConnection(): Promise<void> {
    try {
      const response = await fetch('/api/komoot/status')
      const payload = (await response.json()) as KomootConnection

      setKomootConnection(
        response.ok
          ? payload
          : { connected: false, error: payload.error ?? 'Komoot status could not be checked.' },
      )
    } catch {
      setKomootConnection({
        connected: false,
        error: 'Komoot status could not be checked.',
      })
    }
  }

  function handleSourceCreate(source: TrackSource): void {
    setIsAddSourceOpen(false)
    void library.addSource(source)
  }

  function handleSourceVisibilityChange(source: TrackSource, visible: boolean): void {
    library.setSourceVisible(source, visible)

    if (!visible) {
      setTooltip(null)
    }
  }

  function handleSourceExpandedChange(source: TrackSource, expanded: boolean): void {
    library.setSourceExpanded(source, expanded)
  }

  function handleSourceColorChange(source: TrackSource, color: string): void {
    library.setSourceColor(source, color)
  }

  function handleDeleteSource(source: TrackSource): void {
    const progress = library.sourceProgress(source)

    if (!window.confirm(`Delete source "${source.name}" and ${progress.total} tracks?`)) {
      return
    }

    library.deleteSource(source)
    setTooltip(null)
  }

  function handleTrackVisibilityChange(meta: TrackMeta, visible: boolean): void {
    library.setTrackVisible(meta, visible)

    if (!visible && library.activeMeta === null) {
      setTooltip(null)
    }
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

    library.setTrackColor(colorPalette.meta, color)
    setColorPalette(null)
  }

  function handleTrackActivate(meta: TrackMeta): void {
    library.activateTrack(meta)
  }

  function handleTrackFocus(meta: TrackMeta): void {
    library.focusTrack(meta)
    setColorPalette(null)
  }

  function handleMapTrackClick(track: Track, point: TrackMapPoint): void {
    if (track.meta !== null) {
      library.activateTrack(track.meta)
    }

    setTooltip({ track, point: { x: point.x, y: point.y } })
    setColorPalette(null)
  }

  return (
    <section className="workspace" aria-label="Track workspace">
      <div className="map-shell">
        <TrackMap
          tracks={visibleTracks}
          activeTrack={activeTrack}
          focusedTrack={library.focusedTrack}
          onTrackClick={handleMapTrackClick}
          onMapClick={() => {
            setTooltip(null)
            setColorPalette(null)
          }}
        />

        {library.sources.length === 0 && (
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

        {library.lastError !== null && (
          <p className="workspace-error" role="alert">
            {library.lastError}
          </p>
        )}
      </div>

      <TrackSidebar
        library={library}
        searchQuery={searchQuery}
        loading={library.isLoading()}
        collapsed={!isSidebarOpen}
        onSearchChange={setSearchQuery}
        onAddSourceClick={() => {
          setTooltip(null)
          setColorPalette(null)
          setIsAddSourceOpen(true)
        }}
        onSettingsClick={() => {
          setIsSettingsOpen(true)
          void refreshKomootConnection()
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
        onMoveSource={(source, direction) => library.moveSource(source, direction)}
        onDeleteSource={handleDeleteSource}
        onTrackActivate={handleTrackActivate}
        onTrackFocus={handleTrackFocus}
        onTrackVisibilityChange={handleTrackVisibilityChange}
        onTrackColorClick={(meta, left, top) => {
          setColorPalette({ kind: 'track', meta, left, top })
        }}
      />

      {colorPalette !== null && (
        <ColorPalette
          left={colorPalette.left}
          top={colorPalette.top}
          value={
            colorPalette.kind === 'source'
              ? colorPalette.source.color
              : colorPalette.meta.color
          }
          onChange={handleColorPaletteChange}
        />
      )}

      {isAddSourceOpen && (
        <AddSourceDialog
          sourceIndex={library.sources.length}
          komootConnection={komootConnection}
          onOpenSettings={() => {
            setIsAddSourceOpen(false)
            setIsSettingsOpen(true)
          }}
          onCancel={() => setIsAddSourceOpen(false)}
          onCreate={handleSourceCreate}
        />
      )}

      {isSettingsOpen && (
        <SettingsDialog
          komootConnection={komootConnection}
          onClose={() => setIsSettingsOpen(false)}
          onKomootConnected={setKomootConnection}
          onKomootDisconnected={() => setKomootConnection({ connected: false })}
        />
      )}
    </section>
  )
}
