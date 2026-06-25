import type { StyleSpecification } from 'maplibre-gl'

export interface MapLayerData {
  id: string
  title: string
  role: string
  sourceType: string
  groupId: string
  order: number
  style: StyleSpecification | string
  attribution: string
  defaultOpacity: number
  visualProfileId?: string
  reliability: string
}

export interface MapVisualProfileData {
  id: string
  title: string
  raster?: { opacity?: number; brightnessMin?: number; brightnessMax?: number; saturation?: number; contrast?: number; resampling?: string }
  track?: { lineWidth?: number; casingWidth?: number; selectedLineWidth?: number; selectedCasingWidth?: number; casingColor?: string }
  hillshade?: { exaggeration?: number; shadowColor?: string; highlightColor?: string; accentColor?: string; illuminationDirection?: number; illuminationAnchor?: string }
}

export interface MapLayerGroupData {
  id: string
  title: string
  order: number
}

export interface MapLayerPresetData {
  id: string
  title: string
  baseLayerId: string
  enabledOverlayLayerIds: string[]
  enabledTerrainLayerIds: string[]
  layerOpacityOverrides?: Record<string, number>
  trackVisualMode: string
}

export const mapVisualProfiles: Record<string, MapVisualProfileData> = {
  cleanRaster: { id: 'cleanRaster', title: 'Clean raster', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 1, saturation: 0, contrast: 0, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(255,255,255,0.9)' } },
  readableTopo: { id: 'readableTopo', title: 'Readable topo', raster: { opacity: 1, brightnessMin: 0.02, brightnessMax: 0.98, saturation: 0.05, contrast: 0.12, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(255,255,255,0.92)' } },
  satelliteForTracks: { id: 'satelliteForTracks', title: 'Satellite for tracks', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 0.9, saturation: -0.08, contrast: 0.08, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(0,0,0,0.68)' } },
  softHillshade: { id: 'softHillshade', title: 'Soft hillshade', hillshade: { exaggeration: 0.35, illuminationDirection: 315, illuminationAnchor: 'viewport' } },
}

export const mapLayers: MapLayerData[] = [
  {
    id: 'osm',
    title: 'OpenStreetMap',
    role: 'base',
    sourceType: 'raster',
    groupId: 'base',
    order: 100,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '\u00a9 OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    } as StyleSpecification,
    attribution: '\u00a9 OpenStreetMap contributors',
    defaultOpacity: 1,
    visualProfileId: 'cleanRaster',
    reliability: 'normal',
  },
  {
    id: 'opentopomap',
    title: 'OpenTopoMap',
    role: 'base',
    sourceType: 'raster',
    groupId: 'topo',
    order: 200,
    style: {
      version: 8,
      sources: {
        opentopomap: {
          type: 'raster',
          tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 17,
          attribution: '\u00a9 OpenTopoMap, \u00a9 OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'opentopomap', type: 'raster', source: 'opentopomap' }],
    } as StyleSpecification,
    attribution: '\u00a9 OpenTopoMap, \u00a9 OpenStreetMap contributors',
    defaultOpacity: 1,
    visualProfileId: 'readableTopo',
    reliability: 'normal',
  },
  {
    id: 'cyclosm',
    title: 'CyclOSM',
    role: 'base',
    sourceType: 'raster',
    groupId: 'base',
    order: 300,
    style: {
      version: 8,
      sources: {
        cyclosm: {
          type: 'raster',
          tiles: [
            'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
            'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
            'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          maxzoom: 18,
          attribution: '\u00a9 CyclOSM, \u00a9 OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'cyclosm', type: 'raster', source: 'cyclosm' }],
    } as StyleSpecification,
    attribution: '\u00a9 CyclOSM, \u00a9 OpenStreetMap contributors',
    defaultOpacity: 1,
    visualProfileId: 'readableTopo',
    reliability: 'normal',
  },
  {
    id: 'esri-satellite',
    title: 'ESRI Satellite',
    role: 'base',
    sourceType: 'raster',
    groupId: 'satellite',
    order: 400,
    style: {
      version: 8,
      sources: {
        esriSatellite: {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/tile/1.0.0/World_Imagery/default/default028mm/{z}/{y}/{x}.jpg'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '\u00a9 Esri and contributors',
        },
      },
      layers: [{ id: 'esriSatellite', type: 'raster', source: 'esriSatellite' }],
    } as StyleSpecification,
    attribution: '\u00a9 Esri and contributors',
    defaultOpacity: 1,
    visualProfileId: 'satelliteForTracks',
    reliability: 'stable',
  },
  {
    id: 'mapterhorn-hillshade',
    title: 'Soft Hillshade',
    role: 'terrain',
    sourceType: 'hillshade',
    groupId: 'relief',
    order: 700,
    style: {
      version: 8,
      sources: {
        'mapterhorn-hillshade': {
          type: 'raster-dem',
          url: 'https://tiles.mapterhorn.com/tilejson.json',
        },
      },
      layers: [{ id: 'mapterhorn-hillshade', type: 'hillshade', source: 'mapterhorn-hillshade', paint: { 'hillshade-exaggeration': 0.35 } }],
    } as StyleSpecification,
    attribution: '\u00a9 Mapterhorn',
    defaultOpacity: 0.18,
    visualProfileId: 'softHillshade',
    reliability: 'normal',
  },
  {
    id: 'waymarked-hiking',
    title: 'Waymarked Hiking Trails',
    role: 'overlay',
    sourceType: 'raster',
    groupId: 'routes',
    order: 1000,
    style: {
      version: 8,
      sources: {
        waymarkedHiking: {
          type: 'raster',
          tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 18,
          attribution: '\u00a9 Waymarked Trails, \u00a9 OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'waymarkedHiking', type: 'raster', source: 'waymarkedHiking' }],
    } as StyleSpecification,
    attribution: '\u00a9 Waymarked Trails, \u00a9 OpenStreetMap contributors',
    defaultOpacity: 0.85,
    visualProfileId: 'cleanRaster',
    reliability: 'normal',
  },
  {
    id: 'waymarked-cycling',
    title: 'Waymarked Cycling Trails',
    role: 'overlay',
    sourceType: 'raster',
    groupId: 'routes',
    order: 1010,
    style: {
      version: 8,
      sources: {
        waymarkedCycling: {
          type: 'raster',
          tiles: ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 18,
          attribution: '\u00a9 Waymarked Trails, \u00a9 OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'waymarkedCycling', type: 'raster', source: 'waymarkedCycling' }],
    } as StyleSpecification,
    attribution: '\u00a9 Waymarked Trails, \u00a9 OpenStreetMap contributors',
    defaultOpacity: 0.8,
    visualProfileId: 'cleanRaster',
    reliability: 'normal',
  },
  {
    id: 'osm-gps-traces',
    title: 'OpenStreetMap GPS Traces',
    role: 'overlay',
    sourceType: 'raster',
    groupId: 'activity',
    order: 1200,
    style: {
      version: 8,
      sources: {
        osmGpsTraces: {
          type: 'raster',
          tiles: ['https://gps.tile.openstreetmap.org/lines/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 18,
          attribution: '\u00a9 OpenStreetMap public GPS traces',
        },
      },
      layers: [{ id: 'osmGpsTraces', type: 'raster', source: 'osmGpsTraces' }],
    } as StyleSpecification,
    attribution: '\u00a9 OpenStreetMap public GPS traces',
    defaultOpacity: 0.5,
    visualProfileId: 'cleanRaster',
    reliability: 'normal',
  },
]

export const mapLayerGroups: MapLayerGroupData[] = [
  { id: 'base', title: '\u041e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u043a\u0430\u0440\u0442\u044b', order: 100 },
  { id: 'topo', title: '\u0422\u043e\u043f\u043e\u0433\u0440\u0430\u0444\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u043a\u0430\u0440\u0442\u044b', order: 200 },
  { id: 'satellite', title: '\u0421\u043f\u0443\u0442\u043d\u0438\u043a', order: 300 },
  { id: 'relief', title: '\u0420\u0435\u043b\u044c\u0435\u0444', order: 400 },
  { id: 'routes', title: '\u041c\u0430\u0440\u0448\u0440\u0443\u0442\u044b \u0438 \u0442\u0440\u043e\u043f\u044b', order: 500 },
  { id: 'activity', title: '\u0421\u043b\u0435\u0434\u044b \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438', order: 600 },
]

export const mapLayerPresets: MapLayerPresetData[] = [
  { id: 'clean-osm', title: 'OSM \u0447\u0438\u0441\u0442\u0430\u044f', baseLayerId: 'osm', enabledOverlayLayerIds: [], enabledTerrainLayerIds: [], trackVisualMode: 'lightBase' },
  { id: 'hiking-osm', title: 'OSM + \u0442\u0440\u043e\u043f\u044b', baseLayerId: 'osm', enabledOverlayLayerIds: ['waymarked-hiking'], enabledTerrainLayerIds: [], layerOpacityOverrides: { 'waymarked-hiking': 0.85 }, trackVisualMode: 'lightBase' },
  { id: 'topo-hiking', title: '\u0422\u043e\u043f\u043e \u0434\u043b\u044f \u043f\u043e\u0445\u043e\u0434\u0430', baseLayerId: 'opentopomap', enabledOverlayLayerIds: ['waymarked-hiking'], enabledTerrainLayerIds: [], layerOpacityOverrides: { 'waymarked-hiking': 0.75 }, trackVisualMode: 'topo' },
  { id: 'satellite-hiking', title: '\u0421\u043f\u0443\u0442\u043d\u0438\u043a + \u0442\u0440\u043e\u043f\u044b', baseLayerId: 'esri-satellite', enabledOverlayLayerIds: ['waymarked-hiking'], enabledTerrainLayerIds: ['mapterhorn-hillshade'], layerOpacityOverrides: { 'waymarked-hiking': 0.9, 'mapterhorn-hillshade': 0.25 }, trackVisualMode: 'satellite' },
]
