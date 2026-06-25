import type { MapLayerDefinition } from '../model/MapLayer'

export const terrainLayers: MapLayerDefinition[] = [{
  id: 'mapterhorn-hillshade', title: 'Soft Hillshade', kind: 'terrain', role: 'hillshade', sourceType: 'rasterDem', groupId: 'relief', order: 700,
  style: { version: 8, sources: { 'mapterhorn-hillshade': { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json' } }, layers: [{ id: 'mapterhorn-hillshade', type: 'hillshade', source: 'mapterhorn-hillshade', paint: { 'hillshade-exaggeration': 0.35 } }] },
  attribution: '© Mapterhorn', defaultOpacity: 0.18, visualProfileId: 'softHillshade', reliability: 'normal', tags: ['relief', 'hillshade'],
}]
