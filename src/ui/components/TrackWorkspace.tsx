import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KomootConnectionService,
} from '../../application/KomootConnectionService'
import { TrackLibrary } from '../../application/TrackLibrary'
import { createTrackSourceFromAppUrl } from '../../application/createTrackSourceFromAppUrl'
import { KomootTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import type { TrackMeta } from '../../model/TrackMeta'
import { DEFAULT_MAP_STYLE_SETTINGS } from '../map/mapStyleSettings'
import { defaultTrackColor } from '../trackColors'
import AddSourceDialog from './AddSourceDialog'
import ColorPalette from './ColorPalette'
import SettingsDialog from './SettingsDialog'
import TrackMap from './TrackMap'
import TrackSidebar from './TrackSidebar'
import TrackTooltip, { type TrackTooltipState } from './TrackTooltip'

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
  const [komootConnection] = useState(() => new KomootConnectionService())
  const [libraryVersion, setLibraryVersion] = useState(0)
  const [komootConnectionVersion, setKomootConnectionVersion] = useState(0)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mapStyleSettings, setMapStyleSettings] = useState(
    DEFAULT_MAP_STYLE_SETTINGS,
  )
  const [colorPalette, setColorPalette] = useState<ColorPaletteState | null>(null)
  const [sourceLinkError, setSourceLinkError] = useState<string | null>(null)
  const sourceLinkHandled = useRef(false)

  useEffect(
    () => library.subscribe(() => setLibraryVersion((version) => version + 1)),
    [library],
  )

  useEffect(
    () => komootConnection.subscribe(
      () => setKomootConnectionVersion((version) => version + 1),
    ),
    [komootConnection],
  )

  useEffect(() => {
    void initializeKomoot()
  }, [])

  const visibleTracks = useMemo(
    () => library.visibleTracks(),
    [library, libraryVersion],
  )
  const activeTrack = library.activeMeta?.track ?? null
  const komootState = useMemo(
    () => komootConnection.state,
    [komootConnection, komootConnectionVersion],
  )

  async function initializeKomoot(): Promise<void> {
    await komootConnection.initialize()

    if (sourceLinkHandled.current) {
      return
    }

    sourceLinkHandled.current = true

    try {
      const source = createTrackSourceFromAppUrl(window.location.href, {
        color: defaultTrackColor(library.sources.length),
        order: library.sources.length,
        komootApi: komootConnection.publicApi(),
      })

      if (source !== null) {
        void library.addSource(source)
      }
    } catch (error) {
      setSourceLinkError(
        error instanceof Error ? error.message : 'The source link could not be opened.',
      )
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
    setTooltip(null)
  }

  function handleTrackFocus(meta: TrackMeta): void {
    library.focusTrack(meta)
    setTooltip(null)
    setColorPalette(null)
  }

  function handleMapTrackClick(track: Track): void {
    if (track.meta !== null) {
      library.activateTrack(track.meta)
    }

    setTooltip({ track })
    setColorPalette(null)
  }

  return (
    <section className="workspace" aria-label="Track workspace">
      <div className="map-shell">
        <TrackMap
          tracks={visibleTracks}
          activeTrack={activeTrack}
          focusedTrack={library.focusedTrack}
          mapStyleSettings={mapStyleSettings}
          onMapStyleSettingsChange={setMapStyleSettings}
          onTrackClick={handleMapTrackClick}
          onMapClick={() => {
            setTooltip(null)
            setColorPalette(null)
          }}
        />

        <TrackTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />

        {(sourceLinkError ?? library.lastError) !== null && (
          <p className="workspace-error" role="alert">
            {sourceLinkError ?? library.lastError}
          </p>
        )}
      </div>

      <TrackSidebar
        library={library}
        searchQuery={searchQuery}
        collapsed={!isSidebarOpen}
        onSearchChange={setSearchQuery}
        onAddSourceClick={() => {
          setTooltip(null)
          setColorPalette(null)
          setIsAddSourceOpen(true)
        }}
        onSettingsClick={() => {
          setIsSettingsOpen(true)
          void komootConnection.refresh()
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
        onSourceMove={(source, targetIndex) => library.moveSourceToIndex(source, targetIndex)}
        onSourceRename={(source, name) => library.renameSource(source, name)}
        onDeleteSource={handleDeleteSource}
        onTrackActivate={handleTrackActivate}
        onTrackFocus={handleTrackFocus}
        onTrackVisibilityChange={handleTrackVisibilityChange}
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
          komootConnection={komootState}
          onCreateKomootSource={({ target, name, color, listType, accountSource }) => {
            const targetType = KomootTrackSource.getTargetType(target)

            if (!accountSource && targetType !== 'tour' && targetType !== 'collection') {
              throw new Error('Enter a Komoot tour or collection URL.')
            }

            return new KomootTrackSource(
              target,
              name,
              color,
              listType,
              accountSource
                ? komootConnection.accountApi()
                : komootConnection.publicApi(),
            )
          }}
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
          komootConnection={komootState}
          onClose={() => setIsSettingsOpen(false)}
          onKomootConnect={(email, password) => komootConnection.connect(email, password)}
          onKomootDisconnect={() => komootConnection.disconnect()}
        />
      )}
    </section>
  )
}
