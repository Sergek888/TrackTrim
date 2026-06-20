import maplibregl from 'maplibre-gl'
import type { MapStyleSettings } from './mapStyleSettings'
import { mapLabelTextField } from './mapLabels'
import {
  getAllBaseStyleLayerIds,
  getBaseStyleLayerIds,
  isLabelLayerVisibleForBaseStyle,
} from './MapSources'
import {
  CONTOURS_LAYER_ID,
  HILLSHADE_LAYER_ID,
  MAP_LABELS_LAYER_ID,
  OPENFREEMAP_LABELS_LAYER_ID,
  SATELLITE_LAYER_ID,
} from './mapLayerIds'

export { MAP_BASE_STYLE_CONFIGS, createInitialMapStyle } from './MapSources'

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
  for (const layerId of getAllBaseStyleLayerIds()) {
    setLayerVisibility(map, layerId, false)
  }

  for (const layerId of getBaseStyleLayerIds(settings.baseStyle)) {
    setLayerVisibility(map, layerId, true)
  }

  setLayerVisibility(
    map,
    MAP_LABELS_LAYER_ID,
    isLabelLayerVisibleForBaseStyle(settings.baseStyle),
  )
  setLayerVisibility(map, CONTOURS_LAYER_ID, settings.showContours)
  setLayerVisibility(map, HILLSHADE_LAYER_ID, settings.showHillshade)

  for (const layerId of [MAP_LABELS_LAYER_ID, OPENFREEMAP_LABELS_LAYER_ID]) {
    if (map.getLayer(layerId) !== undefined) {
      map.setLayoutProperty(
        layerId,
        'text-field',
        mapLabelTextField(settings.labelMode),
      )
    }
  }

  if (map.getLayer(SATELLITE_LAYER_ID) !== undefined) {
    map.setPaintProperty(
      SATELLITE_LAYER_ID,
      'raster-opacity',
      settings.satelliteOpacity / 100,
    )
  }
}
