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
  TERRAIN_SOURCE_ID,
} from './mapLayerIds'

export { MAP_BASE_STYLE_CONFIGS, createInitialMapStyle } from './MapSources'

const TERRAIN_EXAGGERATION = 1.35
const TERRAIN_PITCH = 60

type TerrainOptions = {
  source: string
  exaggeration?: number
}

type TerrainSetter = (
  this: maplibregl.Map,
  options: TerrainOptions | null,
) => maplibregl.Map

export function setLayerVisibility(
  map: maplibregl.Map,
  layerId: string,
  visible: boolean,
): void {
  if (map.getLayer(layerId) !== undefined) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
  }
}

function setTerrain(map: maplibregl.Map, options: TerrainOptions | null): void {
  ;(map.setTerrain as TerrainSetter).call(map, options)
}

function applyTerrainSettings(
  map: maplibregl.Map,
  settings: MapStyleSettings,
): void {
  const currentTerrain = map.getTerrain()

  if (settings.showTerrain3D) {
    if (currentTerrain?.source !== TERRAIN_SOURCE_ID) {
      setTerrain(map, {
        source: TERRAIN_SOURCE_ID,
        exaggeration: TERRAIN_EXAGGERATION,
      })
    }

    if (map.getPitch() < TERRAIN_PITCH) {
      map.easeTo({
        pitch: TERRAIN_PITCH,
        bearing: map.getBearing(),
        duration: 350,
      })
    }
    return
  }

  if (currentTerrain !== null && currentTerrain !== undefined) {
    setTerrain(map, null)
  }

  if (map.getPitch() > 0) {
    map.easeTo({
      pitch: 0,
      duration: 350,
    })
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
  applyTerrainSettings(map, settings)

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
