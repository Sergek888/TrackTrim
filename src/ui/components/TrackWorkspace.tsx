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
import { DEFAULT_MAP_STYLE_SETTINGS } from '../map/mapStyleSettings'
import { defaultTrackColor } from '../trackColors'
import Notice from '../shared/Notice'
import TrackMap from '../map/TrackMap'
import TrackSidebar from './TrackSidebar'
import TrackTooltip, { type TrackTooltipState } from './TrackTooltip'
import WorkspacePanels from './WorkspacePanels'

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

type WorkspacePanel = 'tracks' | 'add-source' | 'settings' | 'map-settings'

type WorkspacePanelState = {
  active: WorkspacePanel | null
  returnTo: WorkspacePanel | null
}

export default function TrackWorkspace() {
  const [library] = useState(() => new TrackLibrary())
  const [komootConnection] = useState(() => new KomootConnectionService())
  const [, setLibraryVersion] = useState(0)
  const [mapVersion, setMapVersion] = useState(0)
  const [komootConnectionVersion, setKomootConnectionVersion] = useState(0)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [panel, setPanel] = useState<WorkspacePanelState>({
    active: null,
    returnTo: null,
  })
  const [mapStyleSettings, setMapStyleSettings] = useState(
    DEFAULT_MAP_STYLE_SETTINGS,
  )
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
  const isRightPanelOpen = panel.active !== null

  function openPanel(
    active: WorkspacePanel,
    returnTo: WorkspacePanel | null = null,
  ): void {
    setPanel({ active, returnTo })
    setTooltip(null)
    setColorPalette(null)
  }

  function closePanel(): void {
    setPanel((current) => ({ active: current.returnTo, returnTo: null }))
  }

  function handleSourceCreate(source: TrackSource): void {
    setPanel({ active: 'tracks', returnTo: null })
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
      setTooltip({ meta: track.meta })
    }

    setColorPalette(null)
  }

  const extraButtons = useMemo(() => [
    {
      icon: <ListTree aria-hidden="true" />,
      label: 'Tracks',
      title: 'Tracks',
      active: panel.active === 'tracks',
      controls: 'track-sidebar',
      onClick: () => {
        if (panel.active === 'tracks') {
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
      active: panel.active === 'settings',
      onClick: () => {
        if (panel.active === 'settings') {
          closePanel()
          return
        }

        openPanel('settings', panel.active === 'tracks' ? 'tracks' : null)
        void komootConnection.refresh()
      },
    },
  ], [panel])

  return (
    <section
      className="workspace"
      data-right-panel={isRightPanelOpen ? 'open' : 'closed'}
      aria-label="Track workspace"
    >
      <div className="map-area">
        <TrackMap
          tracks={visibleTracks}
          activeTrack={activeTrack}
          focusedTrack={library.focusedTrack}
          mapStyleSettings={mapStyleSettings}
          isMapSettingsOpen={panel.active === 'map-settings'}
          onMapSettingsToggle={() => {
            if (panel.active === 'map-settings') {
              closePanel()
              return
            }

            openPanel(
              'map-settings',
              panel.active === 'tracks' ? 'tracks' : null,
            )
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
        collapsed={panel.active !== 'tracks'}
        onSearchChange={setSearchQuery}
        onAddSourceClick={() => {
          openPanel('add-source', 'tracks')
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
        isAddSourceOpen={panel.active === 'add-source'}
        isSettingsOpen={panel.active === 'settings'}
        isMapSettingsOpen={panel.active === 'map-settings'}
        mapStyleSettings={mapStyleSettings}
        colorPalette={colorPalette}
        onAddSourceClose={closePanel}
        onSettingsClose={closePanel}
        onSettingsOpen={() => {
          openPanel('settings', 'add-source')
          void komootConnection.refresh()
        }}
        onMapSettingsClose={closePanel}
        onMapStyleSettingsChange={setMapStyleSettings}
        onColorPaletteChange={handleColorPaletteChange}
        onSourceCreate={handleSourceCreate}
      />
    </section>
  )
}
