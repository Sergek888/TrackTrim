import type { MapLayerDefinition } from '../model/MapLayer'

function rasterBase(id: string, title: string, tiles: string[], groupId: string, order: number, role: 'plainMap' | 'topographicMap' | 'satellite', maxzoom: number, attribution: string, visualProfileId: string): MapLayerDefinition {
  return { id, title, kind: 'base', role, sourceType: 'raster', groupId, order, style: { version: 8, sources: { [id]: { type: 'raster', tiles, tileSize: 256, maxzoom, attribution } }, layers: [{ id, type: 'raster', source: id }] }, attribution, defaultOpacity: 1, visualProfileId, reliability: role === 'satellite' ? 'stable' : 'normal' }
}

export const baseLayers: MapLayerDefinition[] = [
  rasterBase('osm', 'OpenStreetMap', ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'], 'base', 100, 'plainMap', 19, '© OpenStreetMap contributors', 'cleanRaster'),
  rasterBase('opentopomap', 'OpenTopoMap', ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], 'topo', 200, 'topographicMap', 17, '© OpenTopoMap, © OpenStreetMap contributors', 'readableTopo'),
  rasterBase('cyclosm', 'CyclOSM', ['https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', 'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', 'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'], 'base', 300, 'topographicMap', 18, '© CyclOSM, © OpenStreetMap contributors', 'readableTopo'),
  rasterBase('esri-satellite', 'ESRI Satellite', ['https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/tile/1.0.0/World_Imagery/default/default028mm/{z}/{y}/{x}.jpg'], 'satellite', 400, 'satellite', 19, '© Esri and contributors', 'satelliteForTracks'),
]
