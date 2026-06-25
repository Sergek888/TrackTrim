import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import { getMapLayer } from '../../map/mapSettings'
import { mapVisualProfiles } from '../../map/mapLayers'
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

const DEFAULT_TRACK_STYLE = {
  lineWidth: 4,
  casingWidth: 7,
  selectedLineWidth: 6,
  selectedCasingWidth: 10,
  casingColor: 'rgba(255,255,255,0.9)',
}

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

  const trackStyle = getTrackStyle(baseLayerId)
  ensureTrackCasingLayer(map, trackStyle)
  ensureTrackLineLayer(map, trackStyle)
  ensureActiveTrackCasingLayer(map, trackStyle)
  ensureActiveTrackLineLayer(map, trackStyle)

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

function getTrackStyle(baseLayerId: string): typeof DEFAULT_TRACK_STYLE {
  const layer = getMapLayer(baseLayerId)
  const profileId = layer?.visualProfileId
  const profile = profileId === undefined ? undefined : mapVisualProfiles[profileId as keyof typeof mapVisualProfiles]
  return { ...DEFAULT_TRACK_STYLE, ...profile?.track }
}

function ensureTrackCasingLayer(map: maplibregl.Map, trackStyle: typeof DEFAULT_TRACK_STYLE): void {
  if (map.getLayer(TRACK_CASING_LAYER_ID) !== undefined) {
    map.setPaintProperty(TRACK_CASING_LAYER_ID, 'line-color', trackStyle.casingColor)
    map.setPaintProperty(TRACK_CASING_LAYER_ID, 'line-width', trackStyle.casingWidth)
    return
  }
  map.addLayer({
    id: TRACK_CASING_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': trackStyle.casingColor, 'line-width': trackStyle.casingWidth, 'line-opacity': 0.9 },
  })
}

function ensureTrackLineLayer(map: maplibregl.Map, trackStyle: typeof DEFAULT_TRACK_STYLE): void {
  if (map.getLayer(TRACKS_LAYER_ID) !== undefined) {
    map.setPaintProperty(TRACKS_LAYER_ID, 'line-width', trackStyle.lineWidth)
    return
  }
  map.addLayer({
    id: TRACKS_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'featureIndex'] },
    paint: { 'line-color': ['get', 'color'], 'line-width': trackStyle.lineWidth, 'line-opacity': 0.82 },
  })
}

function ensureActiveTrackCasingLayer(map: maplibregl.Map, trackStyle: typeof DEFAULT_TRACK_STYLE): void {
  if (map.getLayer(ACTIVE_TRACK_CASING_LAYER_ID) !== undefined) {
    map.setPaintProperty(ACTIVE_TRACK_CASING_LAYER_ID, 'line-color', trackStyle.casingColor)
    map.setPaintProperty(ACTIVE_TRACK_CASING_LAYER_ID, 'line-width', trackStyle.selectedCasingWidth)
    return
  }
  map.addLayer({
    id: ACTIVE_TRACK_CASING_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    filter: ['==', ['get', 'active'], true],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': trackStyle.casingColor, 'line-width': trackStyle.selectedCasingWidth, 'line-opacity': 0.95 },
  })
}

function ensureActiveTrackLineLayer(map: maplibregl.Map, trackStyle: typeof DEFAULT_TRACK_STYLE): void {
  if (map.getLayer(ACTIVE_TRACKS_LAYER_ID) !== undefined) {
    map.setPaintProperty(ACTIVE_TRACKS_LAYER_ID, 'line-width', trackStyle.selectedLineWidth)
    return
  }
  map.addLayer({
    id: ACTIVE_TRACKS_LAYER_ID,
    type: 'line',
    source: TRACKS_SOURCE_ID,
    filter: ['==', ['get', 'active'], true],
    layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'featureIndex'] },
    paint: { 'line-color': ['get', 'color'], 'line-width': trackStyle.selectedLineWidth, 'line-opacity': 1 },
  })
}
