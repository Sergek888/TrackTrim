import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import type { MapSettings } from '../../map/model/MapRuntimeLayer'
import { LayerComposer } from '../../map/engine/LayerComposer'
import { MapStyleEngine } from '../../map/engine/MapStyleEngine'
import { mapLayerRegistry } from '../../map/engine/registry'
import { activeTrackToMarkerFeatureCollectionGeoJson, tracksToFeatureCollectionGeoJson, type TrackMarkersFeatureCollectionGeoJson, type TracksFeatureCollectionGeoJson } from '../../formats/geojson/trackToGeoJson'
import { allTracksBounds, trackBounds } from './mapBounds'
import { createMapStyleButton, createTrackMarkerImage } from './mapIcons'
import { queryTrackFeatures, resetInteractiveCursor, setInteractiveCursor } from './mapHitTest'
import { ACTIVE_TRACKS_LAYER_ID, TRACK_FINISH_IMAGE_ID, TRACK_MARKERS_LAYER_ID, TRACK_MARKERS_SOURCE_ID, TRACK_START_IMAGE_ID, TRACKS_LAYER_ID, TRACKS_SOURCE_ID } from './mapLayerIds'
import './map.css'

type ExtraButton = { icon: ReactNode; label: string; title: string; active?: boolean; controls?: string; onClick: () => void }
type Props = { tracks: readonly Track[]; activeTrack: Track | null; focusedTrack: { track: Track; version: number } | null; mapSettings: MapSettings; isMapSettingsOpen: boolean; onMapSettingsToggle: () => void; onTrackClick: (track: Track, point: TrackMapPoint) => void; onMapClick: () => void; extraButtons?: readonly ExtraButton[] }
export type TrackMapPoint = { latitude: number; longitude: number; x: number; y: number }

const EMPTY_TRACKS: TracksFeatureCollectionGeoJson = { type: 'FeatureCollection', features: [] }
const EMPTY_MARKERS: TrackMarkersFeatureCollectionGeoJson = { type: 'FeatureCollection', features: [] }
const TRACK_CASING_LAYER_ID = 'track-lines-casing'
const ACTIVE_TRACK_CASING_LAYER_ID = 'active-track-lines-casing'

export default function TrackMap({ tracks, activeTrack, focusedTrack, mapSettings, isMapSettingsOpen, onMapSettingsToggle, onTrackClick, onMapClick, extraButtons }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const engineRef = useRef<MapStyleEngine | null>(null)
  const styleButtonRef = useRef<HTMLButtonElement | null>(null)
  const extraButtonRefs = useRef<HTMLButtonElement[]>([])
  const [controlsReady, setControlsReady] = useState(false)
  const latest = useRef({ tracks, activeTrack, mapSettings, onTrackClick, onMapClick, onMapSettingsToggle })
  const fittedRef = useRef(false)
  const readyRef = useRef(false)
  latest.current = { tracks, activeTrack, mapSettings, onTrackClick, onMapClick, onMapSettingsToggle }

  useEffect(() => {
    if (containerRef.current === null) return
    const map = new maplibregl.Map({ container: containerRef.current, style: { version: 8, sources: {}, layers: [] }, center: [0, 0], zoom: 1 })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    const group = containerRef.current.querySelector<HTMLElement>('.maplibregl-ctrl-top-right .maplibregl-ctrl-group')
    const handleStyleClick = () => latest.current.onMapSettingsToggle()
    if (group !== null) {
      const button = createMapStyleButton(handleStyleClick); group.append(button); styleButtonRef.current = button
      extraButtonRefs.current = (extraButtons ?? []).map(() => { const item = document.createElement('button'); item.className = 'maplibregl-ctrl-icon map-extra-toggle'; item.type = 'button'; group.append(item); return item })
      setControlsReady(true)
    }

    const restoreRuntime = () => {
      if (map.getSource(TRACKS_SOURCE_ID) === undefined) map.addSource(TRACKS_SOURCE_ID, { type: 'geojson', data: latest.current.tracks.length === 0 ? EMPTY_TRACKS : tracksToFeatureCollectionGeoJson(latest.current.tracks, latest.current.activeTrack) })
      const satellite = latest.current.mapSettings.activeLayerState.baseLayerId === 'esri-satellite'
      const casing = satellite ? 'rgba(0,0,0,0.68)' : 'rgba(255,255,255,0.9)'
      if (map.getLayer(TRACK_CASING_LAYER_ID) === undefined) map.addLayer({ id: TRACK_CASING_LAYER_ID, type: 'line', source: TRACKS_SOURCE_ID, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': casing, 'line-width': 7, 'line-opacity': 0.9 } })
      if (map.getLayer(TRACKS_LAYER_ID) === undefined) map.addLayer({ id: TRACKS_LAYER_ID, type: 'line', source: TRACKS_SOURCE_ID, layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'featureIndex'] }, paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.82 } })
      if (map.getLayer(ACTIVE_TRACK_CASING_LAYER_ID) === undefined) map.addLayer({ id: ACTIVE_TRACK_CASING_LAYER_ID, type: 'line', source: TRACKS_SOURCE_ID, filter: ['==', ['get', 'active'], true], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': casing, 'line-width': 10, 'line-opacity': 0.95 } })
      if (map.getLayer(ACTIVE_TRACKS_LAYER_ID) === undefined) map.addLayer({ id: ACTIVE_TRACKS_LAYER_ID, type: 'line', source: TRACKS_SOURCE_ID, filter: ['==', ['get', 'active'], true], layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'featureIndex'] }, paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 1 } })
      if (map.getSource(TRACK_MARKERS_SOURCE_ID) === undefined) map.addSource(TRACK_MARKERS_SOURCE_ID, { type: 'geojson', data: activeTrackToMarkerFeatureCollectionGeoJson(latest.current.activeTrack) })
      if (!map.hasImage(TRACK_START_IMAGE_ID)) map.addImage(TRACK_START_IMAGE_ID, createTrackMarkerImage('start'), { pixelRatio: 2 })
      if (!map.hasImage(TRACK_FINISH_IMAGE_ID)) map.addImage(TRACK_FINISH_IMAGE_ID, createTrackMarkerImage('finish'), { pixelRatio: 2 })
      if (map.getLayer(TRACK_MARKERS_LAYER_ID) === undefined) map.addLayer({ id: TRACK_MARKERS_LAYER_ID, type: 'symbol', source: TRACK_MARKERS_SOURCE_ID, minzoom: 8, layout: { 'icon-image': ['case', ['==', ['get', 'kind'], 'start'], TRACK_START_IMAGE_ID, TRACK_FINISH_IMAGE_ID], 'icon-allow-overlap': true } })
    }
    engineRef.current = new MapStyleEngine(map, mapLayerRegistry, new LayerComposer(), restoreRuntime)
    map.on('load', () => { readyRef.current = true; void engineRef.current?.applyState(latest.current.mapSettings.activeLayerState).then(() => { const bounds = allTracksBounds(latest.current.tracks); if (bounds !== null) { map.fitBounds(bounds, { padding: 64, duration: 0, maxZoom: 16 }); fittedRef.current = true } }) })
    map.on('mousemove', (event) => queryTrackFeatures(map, event.point).length > 0 ? setInteractiveCursor(map) : resetInteractiveCursor(map))
    map.on('click', (event) => { const index = queryTrackFeatures(map, event.point)[0]?.properties?.featureIndex; const track = typeof index === 'number' ? latest.current.tracks[index] : undefined; if (track === undefined) latest.current.onMapClick(); else latest.current.onTrackClick(track, { latitude: event.lngLat.lat, longitude: event.lngLat.lng, x: event.point.x, y: event.point.y }) })
    return () => { map.remove(); mapRef.current = null; engineRef.current = null; readyRef.current = false }
  }, [])

  useEffect(() => { styleButtonRef.current?.setAttribute('aria-expanded', String(isMapSettingsOpen)) }, [isMapSettingsOpen])
  useEffect(() => { if (readyRef.current) void engineRef.current?.applyState(mapSettings.activeLayerState) }, [mapSettings.activeLayerState])
  useEffect(() => { const map = mapRef.current; if (map === null || !readyRef.current) return; (map.getSource(TRACKS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(tracks.length === 0 ? EMPTY_TRACKS : tracksToFeatureCollectionGeoJson(tracks, activeTrack)); (map.getSource(TRACK_MARKERS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(activeTrack === null ? EMPTY_MARKERS : activeTrackToMarkerFeatureCollectionGeoJson(activeTrack)); if (!fittedRef.current) { const bounds = allTracksBounds(tracks); if (bounds !== null) { map.fitBounds(bounds, { padding: 64, duration: 0, maxZoom: 16 }); fittedRef.current = true } } }, [tracks, activeTrack])
  useEffect(() => { const map = mapRef.current; if (map === null || focusedTrack === null) return; const bounds = trackBounds(focusedTrack.track); if (bounds !== null) map.fitBounds(bounds, { padding: 80, duration: 450, maxZoom: 16 }) }, [focusedTrack])
  useEffect(() => { extraButtonRefs.current.forEach((button, index) => { const cfg = extraButtons?.[index]; if (cfg === undefined) return; button.setAttribute('aria-label', cfg.label); button.setAttribute('title', cfg.title); button.setAttribute('aria-pressed', String(cfg.active ?? false)); button.toggleAttribute('data-active', cfg.active ?? false); if (cfg.controls !== undefined) button.setAttribute('aria-controls', cfg.controls); button.onclick = cfg.onClick }) }, [extraButtons])

  return <><div className="track-map" ref={containerRef} aria-label="Track map" />{controlsReady && extraButtonRefs.current.map((button, index) => { const config = extraButtons?.[index]; return config === undefined ? null : createPortal(config.icon, button) })}</>
}
