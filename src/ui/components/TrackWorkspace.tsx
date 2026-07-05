import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers, ListTree, Settings } from 'lucide-react'
import {
  KomootConnectionService,
} from '../../application/KomootConnectionService'
import { configureKomootApi } from '../../application/komoot/getKomootApi'
import { TrackLibrary, type TrackLibraryPersistentState } from '../../application/TrackLibrary'
import { resolveWorkspaceStartup } from '../../application/resolveWorkspaceStartup'
import { IndexedDbModelStore } from '../../application/storage/IndexedDbModelStore'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import { loadMapSettings, saveMapSettings } from '../../map/mapSettings'
import { createLayerStatusState, setLayerStatus, type MapLayerStatusState } from '../../map/mapLayerStatus'
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

const LIBRARY_STORAGE_KEY = 'trackviewer.library'
const LIBRARY_SAVE_DELAY_MS = 800

export default function TrackWorkspace() {
  const [library] = useState(() => new TrackLibrary())
  const modelStore = useMemo(() => new IndexedDbModelStore(), [])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInProgressRef = useRef(false)
  const saveAgainRef = useRef(false)
  const [komootConnection] = useState(() => new KomootConnectionService())
  const [, setLibraryVersion] = useState(0)
  const [mapVersion, setMapVersion] = useState(0)
  const [komootConnectionVersion, setKomootConnectionVersion] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [tooltip, setTooltip] = useState<TrackTooltipState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activePanel, setActivePanel] = useState<WorkspacePanel | null>(null)
  const [mapSettings, setMapSettings] = useState(loadMapSettings)
  const [layerStatus, setLayerStatusState] = useState<MapLayerStatusState>(createLayerStatusState)
  const [colorPalette, setColorPalette] = useState<ColorPaletteState | null>(null)
  const [sourceLinkError, setSourceLinkError] = useState<string | null>(null)

  const handleLayerStatus = useCallback((layerId: string, status: 'idle' | 'loading' | 'ready' | 'failed') => {
    setLayerStatusState((prev) => setLayerStatus(prev, layerId, status))
  }, [])

  useEffect(() => {
    configureKomootApi(komootConnection.publicApi())
  }, [komootConnection])

  function runLibrarySave(): void {
    if (saveInProgressRef.current) {
      saveAgainRef.current = true
      return
    }

    saveInProgressRef.current = true

    void modelStore.saveRoot(LIBRARY_STORAGE_KEY, library.persistentState())
      .finally(() => {
        saveInProgressRef.current = false

        if (saveAgainRef.current) {
          saveAgainRef.current = false
          scheduleLibrarySave()
        }
      })
  }

  function scheduleLibrarySave(): void {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      runLibrarySave()
    }, LIBRARY_SAVE_DELAY_MS)
  }

  useEffect(() => {
    let cancelled = false

    modelStore.loadRoot<TrackLibraryPersistentState>(LIBRARY_STORAGE_KEY)
      .then((restoredState) => {
        if (cancelled) {
          return
        }

        if (restoredState !== null) {
          library.restorePersistentState(restoredState)
          setMapVersion((version) => version + 1)
        }

        setHydrated(true)
      })
      .catch(() => {
        if (!cancelled) {
          setHydrated(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [library, modelStore])

  useEffect(
    () => {
      if (!hydrated) {
        return
      }

      return library.subscribe((change) => {
      setLibraryVersion((version) => version + 1)
      scheduleLibrarySave()

      if (change.mapChanged) {
        setMapVersion((version) => version + 1)
      }
    })
    },
    [hydrated, library, modelStore],
  )

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        runLibrarySave()
      }
    },
    [],
  )

  useEffect(() => saveMapSettings(mapSettings), [mapSettings])

  useEffect(
    () => komootConnection.subscribe(
      () => setKomootConnectionVersion((version) => version + 1),
    ),
    [komootConnection],
  )

  useEffect(() => {
    if (!hydrated) {
      return
    }

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
  }, [hydrated, komootConnection, library])

  const visibleTrackMetas = useMemo(
    () => library.visibleTrackMetas(),
    [library, mapVersion],
  )
  const komootState = useMemo(
    () => komootConnection.state,
    [komootConnection, komootConnectionVersion],
  )
  const isRightPanelOpen = activePanel !== null

  function openPanel(active: WorkspacePanel): void {
    setActivePanel(active)
    setTooltip(null)
    setColorPalette(null)
  }

  function closePanel(): void {
    setActivePanel(null)
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
    source.expanded = expanded
    scheduleLibrarySave()
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

  function handleMapTrackClick(meta: TrackMeta): void {
    library.activateTrack(meta)
    setTooltip({ meta })
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
      icon: <Layers aria-hidden="true" />,
      label: 'Map layers',
      title: 'Map layers',
      active: activePanel === 'map-settings',
      onClick: () => {
        if (activePanel === 'map-settings') {
          closePanel()
          return
        }

        openPanel('map-settings')
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
      aria-label="Track workspace"
    >
      <div className="map-area">
        <TrackMap
          trackMetas={visibleTrackMetas}
          activeMeta={library.activeMeta}
          focusedTrack={library.focusedTrack}
          mapSettings={mapSettings}
          isRightPanelOpen={isRightPanelOpen}
          onTrackClick={handleMapTrackClick}
          onMapClick={() => {
            setTooltip(null)
            setColorPalette(null)
          }}
          onLayerStatus={handleLayerStatus}
          extraButtons={extraButtons}
        />

        <TrackTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />

        {(sourceLinkError ?? library.lastError) !== null && (
          <Notice variant="error" alert>
            {sourceLinkError ?? library.lastError}
          </Notice>
        )}
      </div>

      {activePanel === 'tracks' && (
        <TrackSidebar
          library={library}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddSourceClick={() => {
            openPanel('add-source')
          }}
          onClose={closePanel}
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
      )}

      <WorkspacePanels
        library={library}
        komootConnection={komootConnection}
        komootState={komootState}
        isAddSourceOpen={activePanel === 'add-source'}
        isSettingsOpen={activePanel === 'settings'}
        isMapSettingsOpen={activePanel === 'map-settings'}
        isLayerAvailabilityOpen={activePanel === 'layer-availability'}
        mapSettings={mapSettings}
        layerStatus={layerStatus}
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
        onBackToTracks={() => openPanel('tracks')}
      />
    </section>
  )
}
