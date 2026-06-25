import type { MapLayerPreset } from '../model/MapLayerPreset'

export const mapLayerPresets: MapLayerPreset[] = [
  { id: 'clean-osm', title: 'OSM чистая', baseLayerId: 'osm', enabledOverlayLayerIds: [], enabledTerrainLayerIds: [], trackVisualMode: 'lightBase' },
  { id: 'hiking-osm', title: 'OSM + тропы', baseLayerId: 'osm', enabledOverlayLayerIds: ['waymarked-hiking'], enabledTerrainLayerIds: [], layerOpacityOverrides: { 'waymarked-hiking': 0.85 }, trackVisualMode: 'lightBase' },
  { id: 'topo-hiking', title: 'Топо для похода', baseLayerId: 'opentopomap', enabledOverlayLayerIds: ['waymarked-hiking'], enabledTerrainLayerIds: [], layerOpacityOverrides: { 'waymarked-hiking': 0.75 }, trackVisualMode: 'topo' },
  { id: 'satellite-hiking', title: 'Спутник + тропы', baseLayerId: 'esri-satellite', enabledOverlayLayerIds: ['waymarked-hiking'], enabledTerrainLayerIds: ['mapterhorn-hillshade'], layerOpacityOverrides: { 'waymarked-hiking': 0.9, 'mapterhorn-hillshade': 0.25 }, trackVisualMode: 'satellite' },
]
