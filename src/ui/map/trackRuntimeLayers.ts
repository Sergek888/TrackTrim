import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import {
  activeTrackToMarkerFeatureCollectionGeoJson,
  tracksToFeatureCollectionGeoJson,
  type TrackMarkersFeatureCollectionGeoJson,
  type TracksFeatureCollectionGeoJson,
} from '../../formats/geojson/trackToGeoJson'
import { createTrackMarkerImage } from './mapIcons'
import {
  ACTIVE_TRACKS_LAYER_ID,
  TRACK_FINISH_IMAGE_ID,
  TRACK_MARKERS_LAYER_ID,
  TRACK_MARKERS_SOURCE_ID,
  TRACK_START_IMAGE_ID,
  TRACKS_LAYER_ID,
  TRACKS_SOURCE_ID,
} from './mapLayerIds'

const EMPTY_TRACKS: TracksFeatureCollectionGeoJson = { type: 'FeatureCollection', features: [] }
const EMPTY_MARKERS: TrackMarkersFeatureCollectionGeoJson = { type: 'FeatureCollection', features: [] }

export const TRACK_CASING_LAYER_ID = 'track-lines-casing'
export const ACTIVE_TRACK_CASING_LAYER_ID = 'active-track-lines-casing'

export function restoreTrackRuntimeLayers(
  map: maplibregl.Map,
  tracks: readonly Track[],
  activeTrack: Track | null,
  baseLayerId: string,
): void {
  if (map.getSource(TRACKS_SOURCE_ID) === undefined) {
    map.addSource(TRACKS_SOURCE_ID, {
      type: 'geojson',
      data: tracks.length === 0 ? EMPTY_TRACKS : tracksToFeatureCollectionGeoJson(tracks, activeTrack),
    })
  }

  const casing = getTrackCasingColor(baseLayerId)
  ensureTrackCasingLayer(map, casing)
  ensureTrackLineLayer(map)
  ensureActiveTrackCasingLayer(map, casing)
  ensureActiveTrackLineLayer(map)

  if (map.getSource(TRACK_MARKERS_SOURCE_ID) === undefined) {
    map.addSource(TRACK_MARKERS_SOURCE_ID, {
      type: 'geojson',
      data: activeTrackToMarkerFeatureCollectionGeoJson(activeTrack),
    })
  }

  if (!map.hasImage(TRACK_START_IMAGE_ID)) map.addImage(TRACK_START_IMAGE_ID, createTrackMarkerImage('start'), { pixelRatio: 2 })
  if (!map.hasImage(TRACK_FINISH_IMAGE_ID)) map.addImage(TRACK_FINISH_IMAGE_ID, createTrackMarkerImage('finish'), { pixelRatio: 2 })

  if (map.getLayer(TRACK_MARKERS_LAYER_ID) === undefined) {
    map.addLayer({
      id: TRACK_MARKERS_LAYER_ID,
      type: 'symbol',
      source: TRACK_MARKERS_SOURCE_ID,
      minzoom: 8,
      layout: {
        'icon-image': ['case', ['==', ['get', 'kind'], 'start'], TRACK_START_IMAGE_ID, TRACK_FINISH_IMAGE_ID],
        'icon-allow-overlap': true,
      },
    })
  }
}

export function updateTrackRuntimeData(map: maplibregl.Map, tracks: readonly Track[], activeTrack: Track | null): void {
  (map.getSource(TRACKS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
    tracks.length === 0 ? EMPTY_TRACKS : tracksToFeatureCollectionGeoJson(tracks, activeTrack),
  )
  ;(map.getSource(TRACK_MARKERS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
    activeTrack === null ? EMPTY_MARKERS : activeTrackToMarkerFeatureCollectionGeoJson(activeTrack),
  )
}

function getTrackCasingColor(baseLayerId: string): string {
  return baseLayerId === 'esri-satellite' ? 'rgba(0,0,0,0.68)' : 'rgba(255,255,255,0.9)'
}

function ensureTrackCasingLayer(map: maplibregl.Map, color: string): void {
  if (map.getLayer(TRACK_CASING_LAYER_ID) !== undefined) {
    map.setPaintProperty(TRACK_CASING_LAYER_ID, 'line-color', color)
    return
  }
  map.addLayer({
    id: TRACK_CASING_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': color, 'line-width': 7, 'line-opacity': 0.9 },
  })
}

function ensureTrackLineLayer(map: maplibregl.Map): void {
  if (map.getLayer(TRACKS_LAYER_ID) !== undefined) return
  map.addLayer({
    id: TRACKS_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'featureIndex'] },
    paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.82 },
  })
}

function ensureActiveTrackCasingLayer(map: maplibregl.Map, color: string): void {
  if (map.getLayer(ACTIVE_TRACK_CASING_LAYER_ID) !== undefined) {
    map.setPaintProperty(ACTIVE_TRACK_CASING_LAYER_ID, 'line-color', color)
    return
  }
  map.addLayer({
    id: ACTIVE_TRACK_CASING_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    filter: ['==', ['get', 'active'], true],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': color, 'line-width': 10, 'line-opacity': 0.95 },
  })
}

function ensureActiveTrackLineLayer(map: maplibregl.Map): void {
  if (map.getLayer(ACTIVE_TRACKS_LAYER_ID) !== undefined) return
  map.addLayer({
    id: ACTIVE_TRACKS_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    filter: ['==', ['get', 'active'], true],
    layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'featureIndex'] },
    paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 1 },
  })
}
