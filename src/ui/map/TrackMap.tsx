import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { Track } from '../../model/Track'
import type { TrackMeta } from '../../model/TrackMeta'
import type { MapSettings } from '../../map/mapSettings'
import type { MapLayerLoadStatus } from '../../map/mapLayerStatus'
import { MapStyleManager } from '../../map/mapStyleManager'
import {
  type MapRuntimeState,
  createMapRuntimeState,
  recordManualPan,
  recordAutoPosition,
  updateCamera,
  shouldAutoFit,
} from '../../map/mapRuntimeState'
import { allTracksBounds, trackBounds } from './mapBounds'
import { bindMapEvents } from './MapEvents'
import { getInitialFitPadding, getFocusFitPadding } from './MapFitPadding'
import MapControlBar, { type ExtraButton } from './MapControlBar'
import MapCanvas from './MapCanvas'
import { restoreTrackRuntimeLayers, updateTrackRuntimeData } from './trackRuntimeLayers'
import './map.css'

type Props = {
  trackMetas: readonly TrackMeta[]
  activeMeta: TrackMeta | null
  focusedTrack: { track: Track; version: number } | null
  mapSettings: MapSettings
  isRightPanelOpen: boolean
  onTrackClick: (meta: TrackMeta, point: TrackMapPoint) => void
  onMapClick: () => void
  onLayerStatus?: (layerId: string, status: MapLayerLoadStatus) => void
  extraButtons?: readonly ExtraButton[]
}

export type TrackMapPoint = { latitude: number; longitude: number; x: number; y: number }

export default function TrackMap({ trackMetas, activeMeta, focusedTrack, mapSettings, isRightPanelOpen, onTrackClick, onMapClick, onLayerStatus, extraButtons }: Props) {
  const tracks = useMemo(
    () => trackMetas.map((meta) => meta.track).filter((track): track is Track => track !== null),
    [trackMetas],
  )
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [controlGroup, setControlGroup] = useState<HTMLElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const styleManagerRef = useRef<MapStyleManager | null>(null)
  const runtimeStateRef = useRef<MapRuntimeState>(createMapRuntimeState())
  const initialFittedRef = useRef(false)
  const programmaticMoveRef = useRef(false)
  const readyRef = useRef(false)
  const latest = useRef({ tracks, trackMetas, activeMeta, mapSettings, onTrackClick, onMapClick, onLayerStatus })
  latest.current = { tracks, trackMetas, activeMeta, mapSettings, onTrackClick, onMapClick, onLayerStatus }

  useEffect(() => {
    if (containerRef.current === null) return

    const map = new maplibregl.Map({ container: containerRef.current, style: { version: 8, sources: {}, layers: [] }, center: [10, 45], zoom: 4 })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    setControlGroup(containerRef.current.querySelector<HTMLElement>('.maplibregl-ctrl-top-right .maplibregl-ctrl-group'))

    const restoreRuntime = (appliedBaseLayerId: string) => restoreTrackRuntimeLayers(
      map,
      latest.current.trackMetas,
      latest.current.activeMeta,
      appliedBaseLayerId,
    )
    styleManagerRef.current = new MapStyleManager(map, restoreRuntime, (layerId, status) => latest.current.onLayerStatus?.(layerId, status))

    map.on('movestart', () => {
      if (!programmaticMoveRef.current) {
        runtimeStateRef.current = recordManualPan(runtimeStateRef.current)
      }
    })

    map.on('moveend', () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      runtimeStateRef.current = updateCamera(runtimeStateRef.current, center, zoom)
    })

    map.on('load', () => {
      readyRef.current = true
      void styleManagerRef.current?.applyState(latest.current.mapSettings.activeLayerState, latest.current.mapSettings.mapLanguage).then(() => {
        const bounds = allTracksBounds(latest.current.tracks)
        if (bounds !== null) {
          programmaticMoveRef.current = true
          map.fitBounds(bounds, { padding: getInitialFitPadding(false), duration: 0, maxZoom: 16 })
          initialFittedRef.current = true
          const center = map.getCenter()
          const zoom = map.getZoom()
          runtimeStateRef.current = recordAutoPosition(runtimeStateRef.current, center, zoom)
          programmaticMoveRef.current = false
        }
      })
    })

    const unbindMapEvents = bindMapEvents(map, {
      onTrackClick: (track, point) => {
        const meta = latest.current.trackMetas.find((item) => item.track === track) ?? null

        if (meta === null) {
          latest.current.onMapClick()
          return
        }

        latest.current.onTrackClick(meta, point)
      },
      onMapClick: () => latest.current.onMapClick(),
    }, () => latest.current.tracks)

    return () => { unbindMapEvents(); map.remove(); mapRef.current = null; styleManagerRef.current = null; readyRef.current = false; initialFittedRef.current = false; programmaticMoveRef.current = false }
  }, [])

  useEffect(() => {
    if (readyRef.current) void styleManagerRef.current?.applyState(mapSettings.activeLayerState, mapSettings.mapLanguage)
  }, [mapSettings.activeLayerState, mapSettings.mapLanguage])

  useEffect(() => {
    const map = mapRef.current
    if (map === null || !readyRef.current) return
    updateTrackRuntimeData(map, trackMetas, activeMeta)
    const state = runtimeStateRef.current
    if (!initialFittedRef.current || shouldAutoFit(state)) {
      const bounds = allTracksBounds(tracks)
      if (bounds !== null) {
        programmaticMoveRef.current = true
        map.fitBounds(bounds, { padding: getInitialFitPadding(isRightPanelOpen), duration: 0, maxZoom: 16 })
        initialFittedRef.current = true
        const center = map.getCenter()
        const zoom = map.getZoom()
        runtimeStateRef.current = recordAutoPosition(state, center, zoom)
        programmaticMoveRef.current = false
      }
    }
  }, [tracks, trackMetas, activeMeta, isRightPanelOpen])

  useEffect(() => {
    const map = mapRef.current
    if (map === null || focusedTrack === null) return
    const bounds = trackBounds(focusedTrack.track)
    if (bounds !== null) {
      programmaticMoveRef.current = true
      map.fitBounds(bounds, { padding: getFocusFitPadding(isRightPanelOpen), duration: 450, maxZoom: 16 })
      programmaticMoveRef.current = false
    }
  }, [focusedTrack, isRightPanelOpen])

  return (
    <>
      <MapCanvas ref={containerRef} />
      <MapControlBar
        controlGroup={controlGroup}
        extraButtons={extraButtons}
      />
    </>
  )
}
