import type { StyleSpecification } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import mlcontour from 'maplibre-contour'
import type { MapBaseStyle, MapLabelMode, MapStyleSettings } from './mapStyleSettings'
import { mapLabelTextField } from './mapLabels'
import {
  CONTOURS_LAYER_ID,
  HILLSHADE_LAYER_ID,
  MAP_LABELS_LAYER_ID,
  OSM_LAYER_ID,
  SATELLITE_LAYER_ID,
  TOPOGRAPHIC_LAYER_ID,
} from './mapLayerIds'

type MapStyleSource = NonNullable<StyleSpecification['sources']>[string]
type MapStyleLayer = NonNullable<StyleSpecification['layers']>[number]

export type MapSourceKind = 'base' | 'overlay' | 'labels' | 'generated-overlay'

export type MapSourceConfig = {
  id: string
  kind: MapSourceKind
  source: MapStyleSource
}

export type MapBaseStyleConfig = {
  id: MapBaseStyle
  label: string
  layerIds: readonly string[]
  labelLayerVisible: boolean
}

const contourDemSource = new mlcontour.DemSource({
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  encoding: 'terrarium',
  maxzoom: 12,
  worker: false,
})

contourDemSource.setupMaplibre(maplibregl)

export const MAP_BASE_STYLE_CONFIGS: readonly MapBaseStyleConfig[] = [
  { id: 'osm', label: 'OSM', layerIds: [OSM_LAYER_ID], labelLayerVisible: false },
  {
    id: 'topographic',
    label: 'Топографическая',
    layerIds: [TOPOGRAPHIC_LAYER_ID],
    labelLayerVisible: false,
  },
  {
    id: 'satellite',
    label: 'Спутник',
    layerIds: [SATELLITE_LAYER_ID],
    labelLayerVisible: false,
  },
  {
    id: 'hybrid',
    label: 'Гибрид',
    layerIds: [SATELLITE_LAYER_ID],
    labelLayerVisible: true,
  },
]

export const MAP_SOURCE_CONFIGS: readonly MapSourceConfig[] = [
  {
    id: 'osm',
    kind: 'base',
    source: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  {
    id: 'topographic',
    kind: 'base',
    source: {
      type: 'raster',
      tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 17,
      attribution: '© OpenStreetMap contributors, SRTM | OpenTopoMap',
    },
  },
  {
    id: 'satellite',
    kind: 'base',
    source: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri World Imagery',
    },
  },
  {
    id: 'hillshade',
    kind: 'overlay',
    source: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri World Hillshade',
    },
  },
  {
    id: 'mapLabels',
    kind: 'labels',
    source: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution: '© OpenStreetMap contributors | OpenFreeMap',
    },
  },
  {
    id: 'contours',
    kind: 'generated-overlay',
    source: {
      type: 'vector',
      tiles: [
        contourDemSource.contourProtocolUrl({
          thresholds: {
            9: [500, 2500],
            11: [200, 1000],
            13: [100, 500],
            15: [50, 250],
          },
        }),
      ],
      maxzoom: 15,
    },
  },
]

export function createInitialMapStyle(labelMode: MapLabelMode): StyleSpecification {
  const sources: NonNullable<StyleSpecification['sources']> = {}

  for (const config of MAP_SOURCE_CONFIGS) {
    sources[config.id] = config.source
  }

  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources,
    layers: createMapLayers(labelMode),
  }
}

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

function getBaseStyleLayerIds(baseStyle: MapBaseStyle): readonly string[] {
  return MAP_BASE_STYLE_CONFIGS.find((config) => config.id === baseStyle)?.layerIds ?? []
}

function isLabelLayerVisibleForBaseStyle(baseStyle: MapBaseStyle): boolean {
  return (
    MAP_BASE_STYLE_CONFIGS.find((config) => config.id === baseStyle)
      ?.labelLayerVisible ?? false
  )
}

function getAllBaseStyleLayerIds(): readonly string[] {
  return MAP_BASE_STYLE_CONFIGS.flatMap((config) => config.layerIds)
}

function createMapLayers(labelMode: MapLabelMode): MapStyleLayer[] {
  return [
    {
      id: OSM_LAYER_ID,
      type: 'raster',
      source: 'osm',
    },
    {
      id: TOPOGRAPHIC_LAYER_ID,
      type: 'raster',
      source: 'topographic',
      layout: {
        visibility: 'none',
      },
    },
    {
      id: SATELLITE_LAYER_ID,
      type: 'raster',
      source: 'satellite',
      layout: {
        visibility: 'none',
      },
    },
    {
      id: HILLSHADE_LAYER_ID,
      type: 'raster',
      source: 'hillshade',
      layout: {
        visibility: 'none',
      },
      paint: {
        'raster-opacity': 0.35,
      },
    },
    {
      id: CONTOURS_LAYER_ID,
      type: 'line',
      source: 'contours',
      'source-layer': 'contours',
      layout: {
        visibility: 'none',
      },
      paint: {
        'line-color': 'rgba(71, 85, 105, 0.72)',
        'line-width': ['match', ['get', 'level'], 1, 1.15, 0.55],
      },
    },
    {
      id: MAP_LABELS_LAYER_ID,
      type: 'symbol',
      source: 'mapLabels',
      'source-layer': 'place',
      minzoom: 2,
      layout: {
        visibility: 'none',
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
        'text-field': mapLabelTextField(labelMode),
        'text-font': ['Noto Sans Regular'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2,
          10,
          8,
          13,
          14,
          15,
        ],
        'text-max-width': 9,
        'text-padding': 3,
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': 'rgba(255, 255, 255, 0.92)',
        'text-halo-width': 1.5,
      },
    },
  ]
}
