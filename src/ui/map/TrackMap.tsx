import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import maplibregl from 'maplibre-gl'
import type { Track } from '../../model/Track'
import type { MapSettings } from '../../map/mapSettings'
import { MapStyleManager } from '../../map/mapStyleManager'
import { allTracksBounds, trackBounds } from './mapBounds'
import { createMapStyleButton } from './mapIcons'
import { queryTrackFeatures, resetInteractiveCursor, setInteractiveCursor } from './mapHitTest'
import { restoreTrackRuntimeLayers, updateTrackRuntimeData } from './trackRuntimeLayers'
import './map.css'

type ExtraButton = { icon: ReactNode; label: string; title: string; active?: boolean; controls?: string; onClick: () => void }
type Props = { tracks: readonly Track[]; activeTrack: Track | null; focusedTrack: { track: Track; version: number } | null; mapSettings: MapSettings; isMapSettingsOpen: boolean; onMapSettingsToggle: () => void; onTrackClick: (track: Track, point: TrackMapPoint) => void; onMapClick: () => void; extraButtons?: readonly ExtraButton[] }
export type TrackMapPoint = { latitude: number; longitude: number; x: number; y: number }

export default function TrackMap({ tracks, activeTrack, focusedTrack, mapSettings, isMapSettingsOpen, onMapSettingsToggle, onTrackClick, onMapClick, extraButtons }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const styleManagerRef = useRef<MapStyleManager | null>(null)
  const styleButtonRef = useRef<HTMLButtonElement | null>(null)
  const extraButtonRefs = useRef<HTMLButtonElement[]>([])
  const [controlsReady, setControlsReady] = useState(false)
  const latest = useRef({ tracks, activeTrack, mapSettings, onTrackClick, onMapClick, onMapSettingsToggle })
  const fittedRef = useRef(false)
  const readyRef = useRef(false)
  latest.current = { tracks, activeTrack, mapSettings, onTrackClick, onMapClick, onMapSettingsToggle }

  useEffect(() => {
    if (containerRef.current === null) return
    const map = new maplibregl.Map({ container: containerRef.current, style: { version: 8, sources: {}, layers: [] }, center: [10, 45], zoom: 4 })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    const group = containerRef.current.querySelector<HTMLElement>('.maplibregl-ctrl-top-right .maplibregl-ctrl-group')
    const handleStyleClick = () => latest.current.onMapSettingsToggle()
    if (group !== null) {
      const button = createMapStyleButton(handleStyleClick); group.append(button); styleButtonRef.current = button
      extraButtonRefs.current = (extraButtons ?? []).map(() => { const item = document.createElement('button'); item.className = 'maplibregl-ctrl-icon map-extra-toggle'; item.type = 'button'; group.append(item); return item })
      setControlsReady(true)
    }

    const restoreRuntime = () => restoreTrackRuntimeLayers(
      map,
      latest.current.tracks,
      latest.current.activeTrack,
      latest.current.mapSettings.activeLayerState.baseLayerId,
    )
    styleManagerRef.current = new MapStyleManager(map, restoreRuntime)
    map.on('load', () => { readyRef.current = true; void styleManagerRef.current?.applyState(latest.current.mapSettings.activeLayerState).then(() => { const bounds = allTracksBounds(latest.current.tracks); if (bounds !== null) { map.fitBounds(bounds, { padding: 64, duration: 0, maxZoom: 16 }); fittedRef.current = true } }) })
    map.on('mousemove', (event) => queryTrackFeatures(map, event.point).length > 0 ? setInteractiveCursor(map) : resetInteractiveCursor(map))
    map.on('click', (event) => { const index = queryTrackFeatures(map, event.point)[0]?.properties?.featureIndex; const track = typeof index === 'number' ? latest.current.tracks[index] : undefined; if (track === undefined) latest.current.onMapClick(); else latest.current.onTrackClick(track, { latitude: event.lngLat.lat, longitude: event.lngLat.lng, x: event.point.x, y: event.point.y }) })
    return () => { map.remove(); mapRef.current = null; styleManagerRef.current = null; readyRef.current = false }
  }, [])

  useEffect(() => { styleButtonRef.current?.setAttribute('aria-expanded', String(isMapSettingsOpen)) }, [isMapSettingsOpen])
  useEffect(() => { if (readyRef.current) void styleManagerRef.current?.applyState(mapSettings.activeLayerState) }, [mapSettings.activeLayerState])
  useEffect(() => { const map = mapRef.current; if (map === null || !readyRef.current) return; updateTrackRuntimeData(map, tracks, activeTrack); if (!fittedRef.current) { const bounds = allTracksBounds(tracks); if (bounds !== null) { map.fitBounds(bounds, { padding: 64, duration: 0, maxZoom: 16 }); fittedRef.current = true } } }, [tracks, activeTrack])
  useEffect(() => { const map = mapRef.current; if (map === null || focusedTrack === null) return; const bounds = trackBounds(focusedTrack.track); if (bounds !== null) map.fitBounds(bounds, { padding: 80, duration: 450, maxZoom: 16 }) }, [focusedTrack])
  useEffect(() => { extraButtonRefs.current.forEach((button, index) => { const cfg = extraButtons?.[index]; if (cfg === undefined) return; button.setAttribute('aria-label', cfg.label); button.setAttribute('title', cfg.title); button.setAttribute('aria-pressed', String(cfg.active ?? false)); button.toggleAttribute('data-active', cfg.active ?? false); if (cfg.controls !== undefined) button.setAttribute('aria-controls', cfg.controls); button.onclick = cfg.onClick }) }, [extraButtons])

  return <><div className="track-map" ref={containerRef} aria-label="Track map" />{controlsReady && extraButtonRefs.current.map((button, index) => { const config = extraButtons?.[index]; return config === undefined ? null : createPortal(config.icon, button) })}</>
}
