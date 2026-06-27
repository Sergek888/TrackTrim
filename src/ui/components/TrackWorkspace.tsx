import { useEffect, useMemo, useState } from 'react'
import { ListTree, Settings } from 'lucide-react'
import {
  KomootConnectionService,
} from '../../application/KomootConnectionService'
import { TrackLibrary } from '../../application/TrackLibrary'
import { resolveWorkspaceStartup } from '../../application/resolveWorkspaceStartup'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { Track } from '../../model/Track'
import type { TrackMeta } from '../../model/TrackMeta'
import { loadMapSettings, saveMapSettings } from '../../map/mapSettings'
import { defaultTrackColor } from '../trackColors'
import Notice from '../shared/Notice'
import TrackMap from '../map/TrackMap'
import TrackSidebar from './TrackSidebar'
import TrackTooltip, { type TrackTooltipState } from './TrackTooltip'
import WorkspacePanels from './WorkspacePanels'
import './TrackWorkspace.css'

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

type WorkspacePanel = 'tracks' | 'add-source' | 'settings' | 'map-settings' | 'layer-availability'

type SidebarMode = 'collapsed' | 'open' | 'full'

export default function TrackWorkspace() {
  const [library] = useState(() => new TrackLibrary())
  const [komootConnection] = useState(() => new KomootConnectionService())
  const [, setLibraryVersion] = useState(0)
  const [mapVersion, setMapVersion] = useState(0)
  const [komootConnectionVersion, setKomootConnectionVersion] = useState(0)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [activePanel, setActivePanel] = useState<WorkspacePanel | null>(null)
  const [mapSettings, setMapSettings] = useState(loadMapSettings)
  const [colorPalette, setColorPalette] = useState<ColorPaletteState | null>(null)
  const [sourceLinkError, setSourceLinkError] = useState<string | null>(null)

  useEffect(
    () => library.subscribe((change) => {
      setLibraryVersion((version) => version + 1)

      if (change.mapChanged) {
        setMapVersion((version) => version + 1)
      }
    }),
    [library],
  )

  useEffect(() => saveMapSettings(mapSettings), [mapSettings])

  useEffect(
    () => komootConnection.subscribe(
      () => setKomootConnectionVersion((version) => version + 1),
    ),
    [komootConnection],
  )

  useEffect(() => {
    const controller = new AbortController()
    const sourceCount = library.sources.length

    resolveWorkspaceStartup(
      komootConnection,
      {
        appUrl: window.location.href,
        sourceCount,
        defaultColor: defaultTrackColor(sourceCount),
      },
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return

      if (result.sourceLink !== null) {
        if (result.sourceLink.kind === 'source') {
          void library.addSource(result.sourceLink.source)
        } else {
          setSourceLinkError(result.sourceLink.message)
        }
      }
    }).catch(() => {})

    return () => { controller.abort() }
  }, [])

  const visibleTracks = useMemo(
    () => library.visibleTracks(),
    [library, mapVersion],
  )
  const activeTrack = library.activeMeta?.track ?? null
  const komootState = useMemo(
    () => komootConnection.state,
    [komootConnection, komootConnectionVersion],
  )
  const sidebarMode: SidebarMode = activePanel === null
    ? 'collapsed'
    : activePanel !== 'tracks' || isSearchFocused || searchQuery.trim() !== ''
      ? 'full'
      : 'open'
  const isRightPanelOpen = activePanel !== null

  function openPanel(active: WorkspacePanel): void {
    setActivePanel(active)
    setIsSearchFocused(false)
    setTooltip(null)
    setColorPalette(null)
  }

  function closePanel(): void {
    setActivePanel(null)
    setIsSearchFocused(false)
  }

  function handleSourceCreate(source: TrackSource): void {
    setActivePanel('tracks')
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
    library.focusTrack(meta)
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
      setTooltip({ meta: track.meta })
    }

    setColorPalette(null)
  }

  const extraButtons = useMemo(() => [
    {
      icon: <ListTree aria-hidden="true" />,
      label: 'Tracks',
      title: 'Tracks',
      active: activePanel === 'tracks',
      controls: 'track-sidebar',
      onClick: () => {
        if (activePanel === 'tracks') {
          closePanel()
          return
        }

        openPanel('tracks')
      },
    },
    {
      icon: <Settings aria-hidden="true" />,
      label: 'Settings',
      title: 'Settings',
      active: activePanel === 'settings',
      onClick: () => {
        if (activePanel === 'settings') {
          closePanel()
          return
        }

        openPanel('settings')
        void komootConnection.refresh()
      },
    },
  ], [activePanel])

  return (
    <section
      className="workspace"
      data-right-panel={isRightPanelOpen ? 'open' : 'closed'}
      data-sidebar-mode={sidebarMode}
      aria-label="Track workspace"
    >
      <div className="map-area">
        <TrackMap
          tracks={visibleTracks}
          activeTrack={activeTrack}
          focusedTrack={library.focusedTrack}
          mapSettings={mapSettings}
          isMapSettingsOpen={activePanel === 'map-settings'}
          isRightPanelOpen={isRightPanelOpen}
          onMapSettingsToggle={() => {
            if (activePanel === 'map-settings') {
              closePanel()
              return
            }

            openPanel('map-settings')
          }}
          onTrackClick={handleMapTrackClick}
          onMapClick={() => {
            setTooltip(null)
            setColorPalette(null)
          }}
          extraButtons={extraButtons}
        />

        <TrackTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />

        {(sourceLinkError ?? library.lastError) !== null && (
          <Notice variant="error" alert>
            {sourceLinkError ?? library.lastError}
          </Notice>
        )}
      </div>

      <TrackSidebar
        library={library}
        searchQuery={searchQuery}
        collapsed={activePanel !== 'tracks'}
        mode={sidebarMode}
        onSearchChange={setSearchQuery}
        onSearchFocus={() => setIsSearchFocused(true)}
        onSearchBlur={() => setIsSearchFocused(false)}
        onAddSourceClick={() => {
          openPanel('add-source')
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

      <WorkspacePanels
        library={library}
        komootConnection={komootConnection}
        komootState={komootState}
        isAddSourceOpen={activePanel === 'add-source'}
        isSettingsOpen={activePanel === 'settings'}
        isMapSettingsOpen={activePanel === 'map-settings'}
        isLayerAvailabilityOpen={activePanel === 'layer-availability'}
        mapSettings={mapSettings}
        colorPalette={colorPalette}
        onAddSourceClose={closePanel}
        onSettingsClose={closePanel}
        onSettingsOpen={() => {
          openPanel('settings')
          void komootConnection.refresh()
        }}
        onMapSettingsClose={closePanel}
        onMapSettingsChange={setMapSettings}
        onLayerAvailabilityClose={closePanel}
        onLayerAvailabilityOpen={() => openPanel('layer-availability')}
        onColorPaletteChange={handleColorPaletteChange}
        onSourceCreate={handleSourceCreate}
      />
    </section>
  )
}
