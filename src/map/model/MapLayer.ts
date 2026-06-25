import type { StyleSpecification } from 'maplibre-gl'

export type MapLayerKind = 'base' | 'overlay' | 'terrain' | 'labels' | 'runtime' | 'debug'
export type MapLayerSourceType = 'raster' | 'vectorStyle' | 'rasterDem' | 'geojson' | 'wms' | 'wmts'
export type MapLayerRole = 'plainMap' | 'topographicMap' | 'satellite' | 'hybrid' | 'hillshade' | 'contours' | 'routes' | 'trails' | 'heatmap' | 'labels' | 'historicTopo' | 'poi' | 'tracks'
export type MapLayerReliability = 'stable' | 'normal' | 'experimental' | 'fragile' | 'broken'

export interface MapLayerDefinition {
  id: string
  title: string
  description?: string
  kind: MapLayerKind
  role: MapLayerRole
  sourceType: MapLayerSourceType
  groupId: string
  order: number
  style: string | StyleSpecification
  attribution: string
  minZoom?: number
  maxZoom?: number
  maxNativeZoom?: number
  bounds?: [[number, number], [number, number]]
  defaultOpacity: number
  defaultEnabled?: boolean
  visualProfileId?: string
  requiresApiKey?: boolean
  apiKeyName?: string
  requiresProxy?: boolean
  allowOfflineCache?: boolean
  reliability: MapLayerReliability
  tags?: string[]
}
