import type { MapLayerDefinition } from '../model/MapLayer'

function overlay(id: string, title: string, tiles: string[], role: 'routes' | 'trails' | 'heatmap', order: number, opacity: number, attribution: string): MapLayerDefinition {
  return { id, title, kind: 'overlay', role, sourceType: 'raster', groupId: role === 'heatmap' ? 'activity' : 'routes', order, style: { version: 8, sources: { [id]: { type: 'raster', tiles, tileSize: 256, maxzoom: 18, attribution } }, layers: [{ id, type: 'raster', source: id }] }, attribution, defaultOpacity: opacity, visualProfileId: 'cleanRaster', reliability: 'normal' }
}

export const overlayLayers: MapLayerDefinition[] = [
  overlay('waymarked-hiking', 'Waymarked Hiking Trails', ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'], 'trails', 1000, 0.85, '© Waymarked Trails, © OpenStreetMap contributors'),
  overlay('waymarked-cycling', 'Waymarked Cycling Trails', ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'], 'routes', 1010, 0.8, '© Waymarked Trails, © OpenStreetMap contributors'),
  overlay('osm-gps-traces', 'OpenStreetMap GPS Traces', ['https://gps.tile.openstreetmap.org/lines/{z}/{x}/{y}.png'], 'heatmap', 1200, 0.5, '© OpenStreetMap public GPS traces'),
]
