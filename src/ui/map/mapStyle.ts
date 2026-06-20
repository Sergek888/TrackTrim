import maplibregl from 'maplibre-gl'
import type { MapStyleSettings } from './mapStyleSettings'
import { mapLabelTextField } from './mapLabels'
import {
  CONTOURS_LAYER_ID,
  HILLSHADE_LAYER_ID,
  MAP_LABELS_LAYER_ID,
  OSM_LAYER_ID,
  SATELLITE_LAYER_ID,
  TOPOGRAPHIC_LAYER_ID,
} from './mapLayerIds'

export function setLayerVisibility(
  map: maplibregl.Map,
  layerId: string,
  visible: boolean,
): void {
  if (map.getLayer(layerId) !== undefined) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
  }
}

export function applyMapStyleSettings(
  map: maplibregl.Map,
  settings: MapStyleSettings,
): void {
  const satelliteVisible =
    settings.baseStyle === 'satellite' || settings.baseStyle === 'hybrid'

  setLayerVisibility(map, OSM_LAYER_ID, settings.baseStyle === 'osm')
  setLayerVisibility(
    map,
    TOPOGRAPHIC_LAYER_ID,
    settings.baseStyle === 'topographic',
  )
  setLayerVisibility(map, SATELLITE_LAYER_ID, satelliteVisible)
  setLayerVisibility(
    map,
    MAP_LABELS_LAYER_ID,
    settings.baseStyle === 'hybrid',
  )
  setLayerVisibility(map, CONTOURS_LAYER_ID, settings.showContours)
  setLayerVisibility(map, HILLSHADE_LAYER_ID, settings.showHillshade)

  if (map.getLayer(MAP_LABELS_LAYER_ID) !== undefined) {
    map.setLayoutProperty(
      MAP_LABELS_LAYER_ID,
      'text-field',
      mapLabelTextField(settings.labelMode),
    )
  }

  if (map.getLayer(SATELLITE_LAYER_ID) !== undefined) {
    map.setPaintProperty(
      SATELLITE_LAYER_ID,
      'raster-opacity',
      settings.satelliteOpacity / 100,
    )
  }
}
