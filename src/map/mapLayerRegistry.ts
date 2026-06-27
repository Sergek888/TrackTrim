import type { StyleSpecification } from 'maplibre-gl'
import type { MapVisualProfileData } from './mapVisualProfiles'

export type MapLayerRole = 'base' | 'overlay' | 'terrain'
export type MapLayerSourceType = 'raster' | 'vector' | 'hillshade'
export type MapLayerReliability = 'stable' | 'normal' | 'fragile' | 'experimental' | 'broken'
export type MapLayerKind = 'raster-base' | 'vector-base' | 'raster-overlay' | 'vector-overlay' | 'terrain'

type BaseMapLayerData = {
  id: string
  title: string
  groupId: string
  subgroupId?: string
  order: number
  attribution: string
  defaultOpacity?: number
  visualProfileId?: string
  reliability: MapLayerReliability
  defaultVisible: boolean
}

export type RasterBaseLayerData = BaseMapLayerData & {
  kind: 'raster-base'
  role: 'base'
  sourceType: 'raster'
  style: StyleSpecification
}

export type VectorBaseLayerData = BaseMapLayerData & {
  kind: 'vector-base'
  role: 'base'
  sourceType: 'vector'
  styleUrl: string
}

export type RasterOverlayLayerData = BaseMapLayerData & {
  kind: 'raster-overlay'
  role: 'overlay'
  sourceType: 'raster'
  style: StyleSpecification
}

export type VectorOverlayLayerData = BaseMapLayerData & {
  kind: 'vector-overlay'
  role: 'overlay'
  sourceType: 'vector'
  styleUrl: string
}

export type TerrainLayerData = BaseMapLayerData & {
  kind: 'terrain'
  role: 'terrain'
  sourceType: 'hillshade'
  style: StyleSpecification
}

export type MapLayerData = RasterBaseLayerData | VectorBaseLayerData | RasterOverlayLayerData | VectorOverlayLayerData | TerrainLayerData

export interface MapLayerGroupData {
  id: string
  title: string
  order: number
}

export type MapLayerTreeNode = {
  id: string
  title: string
  order: number
  children: MapLayerTreeNode[]
}

export type MapLayerGroupWithLayers = {
  group: MapLayerTreeNode
  layers: MapLayerData[]
}

type LayerDisplayDefaults = {
  defaultOpacity: number
  visualProfileId: string
}

const LAYER_DISPLAY_DEFAULTS: Record<MapLayerKind, LayerDisplayDefaults> = {
  'raster-base': { defaultOpacity: 1, visualProfileId: 'cleanRaster' },
  'vector-base': { defaultOpacity: 1, visualProfileId: 'readableTopo' },
  'raster-overlay': { defaultOpacity: 0.8, visualProfileId: 'cleanRaster' },
  'vector-overlay': { defaultOpacity: 0.8, visualProfileId: 'cleanRaster' },
  'terrain': { defaultOpacity: 0.5, visualProfileId: 'softHillshade' },
}

export function resolveLayerDefaults(layer: MapLayerData): LayerDisplayDefaults {
  const kindDefaults = LAYER_DISPLAY_DEFAULTS[layer.kind]
  return {
    defaultOpacity: layer.defaultOpacity ?? kindDefaults.defaultOpacity,
    visualProfileId: layer.visualProfileId ?? kindDefaults.visualProfileId,
  }
}

export function resolveVisualProfile(layer: MapLayerData, profiles: Record<string, MapVisualProfileData>): MapVisualProfileData | undefined {
  const { visualProfileId } = resolveLayerDefaults(layer)
  return profiles[visualProfileId]
}

export const mapLayerTree: MapLayerTreeNode[] = [
  {
    id: 'world', title: 'Мировые карты', order: 100,
    children: [
      { id: 'base', title: 'Основные', order: 100, children: [] },
      { id: 'topo', title: 'Топографические', order: 200, children: [] },
      { id: 'satellite', title: 'Спутник', order: 300, children: [] },
      { id: 'activity', title: 'Активности', order: 350, children: [] },
    ],
  },
  {
    id: 'countries', title: 'Карты стран', order: 400,
    children: [
      { id: 'switzerland', title: 'Швейцария', order: 410, children: [] },
      { id: 'france', title: 'Франция', order: 420, children: [] },
      { id: 'new-zealand', title: 'Новая Зеландия', order: 430, children: [] },
      { id: 'belgium', title: 'Бельгия', order: 440, children: [] },
      { id: 'spain', title: 'Испания', order: 450, children: [] },
      { id: 'united-kingdom', title: 'Великобритания', order: 460, children: [] },
      { id: 'norway', title: 'Норвегия', order: 470, children: [] },
      { id: 'finland', title: 'Финляндия', order: 480, children: [] },
      { id: 'bulgaria', title: 'Болгария', order: 490, children: [] },
      { id: 'united-states', title: 'США', order: 500, children: [] },
    ],
  },
  {
    id: 'overlays', title: 'Оверлеи', order: 600,
    children: [
      { id: 'routes', title: 'Маршруты и тропы', order: 600, children: [] },
      { id: 'transport', title: 'Транспорт', order: 700, children: [] },
      { id: 'country-overlays', title: 'Слои стран', order: 900, children: [] },
    ],
  },
]

const COMMON_ATTRIBUTION_OSM = '© OpenStreetMap contributors'
const COMMON_ATTRIBUTION_OSM_TRAILS = '© Waymarked Trails, © OpenStreetMap contributors'
const COMMON_ATTRIBUTION_SWISSTOPO = '© swisstopo'
const COMMON_ATTRIBUTION_IGN = 'IGN-F/Géoportail'

const OSM_TILES = [
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
]

const CYCLOSM_TILES = [
  'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
  'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
  'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
]

const CYCLOSM_LITE_TILES = [
  'https://a.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png',
  'https://b.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png',
  'https://c.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png',
]

export const mapLayers: MapLayerData[] = [
  { id: 'liberty-topo', title: 'Liberty Topo', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://styles.gpx.studio/liberty-topo.json', attribution: COMMON_ATTRIBUTION_OSM, groupId: 'topo', order: 80, defaultVisible: true, reliability: 'normal', visualProfileId: 'readableTopo' },
  { id: 'osm-vector', title: 'OSM Vector', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://styles.gpx.studio/osm.json', attribution: COMMON_ATTRIBUTION_OSM, groupId: 'base', order: 95, defaultVisible: true, reliability: 'normal', visualProfileId: 'cleanRaster' },
  { id: 'osm-topo-vector', title: 'OSM Topo Vector', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://styles.gpx.studio/osm-topo.json', attribution: COMMON_ATTRIBUTION_OSM, groupId: 'topo', order: 96, defaultVisible: true, reliability: 'normal', visualProfileId: 'readableTopo' },
  { id: 'osm-raster', title: 'OpenStreetMap Raster', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('osm-raster', OSM_TILES, COMMON_ATTRIBUTION_OSM, 19), attribution: COMMON_ATTRIBUTION_OSM, groupId: 'base', order: 100, defaultVisible: true, reliability: 'normal', visualProfileId: 'cleanRaster' },
  { id: 'opentopomap', title: 'OpenTopoMap', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('opentopomap', ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], '© OpenTopoMap, © OpenStreetMap contributors', 17), attribution: '© OpenTopoMap, © OpenStreetMap contributors', groupId: 'topo', order: 110, defaultVisible: true, reliability: 'normal', visualProfileId: 'readableTopo' },
  { id: 'open-hiking-map', title: 'Open Hiking Map', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('open-hiking-map', ['https://maps.refuges.info/hiking/{z}/{x}/{y}.png'], '© sly, © OpenStreetMap contributors', 18), attribution: '© sly, © OpenStreetMap contributors', groupId: 'topo', order: 120, defaultVisible: true, reliability: 'normal', visualProfileId: 'readableTopo' },
  { id: 'cyclosm', title: 'CyclOSM', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('cyclosm', CYCLOSM_TILES, '© CyclOSM, © OpenStreetMap contributors', 18), attribution: '© CyclOSM, © OpenStreetMap contributors', groupId: 'base', order: 130, defaultVisible: true, reliability: 'normal', visualProfileId: 'readableTopo' },
  { id: 'utagawa-vtt', title: 'UtagawaVTT', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://maps.utagawavtt.com/styles/utagawavtt/style.json', attribution: '© UtagawaVTT, © OpenStreetMap contributors', groupId: 'activity', order: 135, defaultVisible: true, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'esri-satellite', title: 'ESRI Satellite', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('esri-satellite', ['https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/tile/1.0.0/World_Imagery/default/default028mm/{z}/{y}/{x}.jpg'], '© Esri and contributors', 19), attribution: '© Esri and contributors', groupId: 'satellite', order: 140, defaultVisible: false, reliability: 'stable', visualProfileId: 'satelliteForTracks' },

  { id: 'swisstopo-raster', title: 'Swisstopo Raster', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('swisstopo-raster', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg'], COMMON_ATTRIBUTION_SWISSTOPO, 19, 128), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'countries', subgroupId: 'switzerland', order: 300, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'swisstopo-vector', title: 'Swisstopo Vector', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json', attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'countries', subgroupId: 'switzerland', order: 305, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'swisstopo-satellite', title: 'Swisstopo Satellite', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.imagerybasemap.vt/style.json', attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'countries', subgroupId: 'switzerland', order: 306, defaultVisible: false, reliability: 'fragile', visualProfileId: 'satelliteForTracks' },
  { id: 'linz', title: 'LINZ Topographic', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://basemaps.linz.govt.nz/v1/styles/topographic-v2.json?api=d01fbtg0ar23gctac5m0jgyy2ds', attribution: '© LINZ CC BY 4.0', groupId: 'countries', subgroupId: 'new-zealand', order: 308, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'linz-topo', title: 'LINZ Topo Raster', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('linz-topo', ['https://basemaps.linz.govt.nz/v1/tiles/topo-raster/WebMercatorQuad/{z}/{x}/{y}.webp?api=d01fbtg0ar23gctac5m0jgyy2ds'], '© LINZ CC BY 4.0', 16, 256), attribution: '© LINZ CC BY 4.0', groupId: 'countries', subgroupId: 'new-zealand', order: 310, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'ign-belgium', title: 'IGN Belgium', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('ign-belgium', ['https://cartoweb.wmts.ngi.be/1.0.0/topo/default/3857/{z}/{y}/{x}.png'], '© IGN/NGI', 17, 256), attribution: '© IGN/NGI', groupId: 'countries', subgroupId: 'belgium', order: 320, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'ign-fr-plan', title: 'IGN France Plan', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: '/map-styles/ign-fr-plan.json', attribution: COMMON_ATTRIBUTION_IGN, groupId: 'countries', subgroupId: 'france', order: 325, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'ign-fr-topo', title: 'IGN France Topo', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: '/map-styles/ign-fr-topo.json', attribution: COMMON_ATTRIBUTION_IGN, groupId: 'countries', subgroupId: 'france', order: 326, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'ign-fr-scan25', title: 'IGN France Scan 25', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('ign-fr-scan25', ['https://data.geopf.fr/private/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR&FORMAT=image/jpeg&STYLE=normal&apikey=ign_scan_ws'], COMMON_ATTRIBUTION_IGN, 16, 256), attribution: COMMON_ATTRIBUTION_IGN, groupId: 'countries', subgroupId: 'france', order: 330, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'ign-fr-satellite', title: 'IGN France Satellite', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: '/map-styles/ign-fr-satellite.json', attribution: COMMON_ATTRIBUTION_IGN, groupId: 'countries', subgroupId: 'france', order: 335, defaultVisible: false, reliability: 'fragile', visualProfileId: 'satelliteForTracks' },
  { id: 'ign-spain', title: 'IGN Spain', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('ign-spain', ['https://www.ign.es/wmts/mapa-raster?layer=MTN&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'], '© IGN Spain', 20, 256), attribution: '© IGN Spain', groupId: 'countries', subgroupId: 'spain', order: 340, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'ign-spain-satellite', title: 'IGN Spain Satellite', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('ign-spain-satellite', ['https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'], '© IGN Spain', 20, 256), attribution: '© IGN Spain', groupId: 'countries', subgroupId: 'spain', order: 350, defaultVisible: false, reliability: 'fragile', visualProfileId: 'satelliteForTracks' },
  { id: 'ordnance-survey', title: 'Ordnance Survey', kind: 'vector-base', role: 'base', sourceType: 'vector', styleUrl: 'https://api.os.uk/maps/vector/v1/vts/resources/styles?srs=3857&key=piCT8WysfuC3xLSUW7sGLfrAAJoYDvQz', attribution: '© Ordnance Survey', groupId: 'countries', subgroupId: 'united-kingdom', order: 355, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'norway-topo', title: 'Norway Topo', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('norway-topo', ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'], '© Geonorge', 20, 256), attribution: '© Geonorge', groupId: 'countries', subgroupId: 'norway', order: 360, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'finland-topo', title: 'Finland Topo', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('finland-topo', ['https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts?layer=maastokartta&style=default&tilematrixset=WGS84_Pseudo-Mercator&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}&api-key=30cb768c-c968-493c-ae24-2b0b974ebd29'], '© Maanmittauslaitos', 18, 256), attribution: '© Maanmittauslaitos', groupId: 'countries', subgroupId: 'finland', order: 370, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'bg-mountains', title: 'BG Mountains', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('bg-mountains', ['https://bgmtile.kade.si/{z}/{x}/{y}.png'], '© BG Mountains', 19, 256), attribution: '© BG Mountains', groupId: 'countries', subgroupId: 'bulgaria', order: 380, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },
  { id: 'usgs', title: 'USGS Topo', kind: 'raster-base', role: 'base', sourceType: 'raster', style: rasterStyle('usgs', ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}?blankTile=false'], '© USGS', 16, 256), attribution: '© USGS', groupId: 'countries', subgroupId: 'united-states', order: 390, defaultVisible: false, reliability: 'fragile', visualProfileId: 'readableTopo' },

  { id: 'waymarked-hiking', title: 'Waymarked Hiking Trails', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('waymarked-hiking', ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_OSM_TRAILS, 18), attribution: COMMON_ATTRIBUTION_OSM_TRAILS, groupId: 'routes', order: 1000, defaultVisible: true, reliability: 'normal', defaultOpacity: 0.85 },
  { id: 'waymarked-cycling', title: 'Waymarked Cycling Trails', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('waymarked-cycling', ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_OSM_TRAILS, 18), attribution: COMMON_ATTRIBUTION_OSM_TRAILS, groupId: 'routes', order: 1010, defaultVisible: true, reliability: 'normal' },
  { id: 'waymarked-mtb', title: 'Waymarked MTB Trails', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('waymarked-mtb', ['https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_OSM_TRAILS, 18), attribution: COMMON_ATTRIBUTION_OSM_TRAILS, groupId: 'routes', order: 1020, defaultVisible: true, reliability: 'normal' },
  { id: 'waymarked-skating', title: 'Waymarked Skating Trails', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('waymarked-skating', ['https://tile.waymarkedtrails.org/skating/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_OSM_TRAILS, 18), attribution: COMMON_ATTRIBUTION_OSM_TRAILS, groupId: 'routes', order: 1030, defaultVisible: false, reliability: 'normal' },
  { id: 'waymarked-riding', title: 'Waymarked Horse Riding Trails', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('waymarked-riding', ['https://tile.waymarkedtrails.org/riding/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_OSM_TRAILS, 18), attribution: COMMON_ATTRIBUTION_OSM_TRAILS, groupId: 'routes', order: 1040, defaultVisible: false, reliability: 'normal' },
  { id: 'waymarked-winter', title: 'Waymarked Winter Trails', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('waymarked-winter', ['https://tile.waymarkedtrails.org/slopes/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_OSM_TRAILS, 18), attribution: COMMON_ATTRIBUTION_OSM_TRAILS, groupId: 'routes', order: 1050, defaultVisible: false, reliability: 'normal' },
  { id: 'bikerouter-gravel', title: 'BRouter Gravel', kind: 'vector-overlay', role: 'overlay', sourceType: 'vector', styleUrl: '/map-styles/bikerouter-gravel.json', attribution: '© BRouter, © OpenStreetMap contributors', groupId: 'routes', order: 1055, defaultVisible: false, reliability: 'fragile' },
  { id: 'cyclosm-lite', title: 'CyclOSM Lite', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('cyclosm-lite', CYCLOSM_LITE_TILES, '© CyclOSM, © OpenStreetMap contributors', 18), attribution: '© CyclOSM, © OpenStreetMap contributors', groupId: 'routes', order: 1060, defaultVisible: false, reliability: 'normal' },
  { id: 'openrailwaymap', title: 'OpenRailwayMap', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('openrailwaymap', ['https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'], '© OpenRailwayMap, © OpenStreetMap contributors', 18), attribution: '© OpenRailwayMap, © OpenStreetMap contributors', groupId: 'transport', order: 1070, defaultVisible: false, reliability: 'normal' },
  { id: 'osm-gps-traces', title: 'OpenStreetMap GPS Traces', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('osm-gps-traces', ['https://gps.tile.openstreetmap.org/lines/{z}/{x}/{y}.png'], '© OpenStreetMap public GPS traces', 18), attribution: '© OpenStreetMap public GPS traces', groupId: 'activity', order: 1200, defaultVisible: false, reliability: 'normal', defaultOpacity: 0.5 },

  { id: 'swisstopo-slope', title: 'Swisstopo Slope > 30°', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-slope', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1300, defaultVisible: false, reliability: 'fragile', defaultOpacity: 0.4 },
  { id: 'swisstopo-hiking', title: 'Swisstopo Hiking', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-hiking', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swisstlm3d-wanderwege/default/current/3857/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1310, defaultVisible: false, reliability: 'fragile' },
  { id: 'swisstopo-hiking-closures', title: 'Swisstopo Hiking Closures', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-hiking-closures', ['https://wms.geo.admin.ch/?version=1.3.0&service=WMS&request=GetMap&sld_version=1.1.0&layers=ch.astra.wanderland-sperrungen_umleitungen&format=image/png&STYLE=default&bbox={bbox-epsg-3857}&width=256&height=256&crs=EPSG:3857&transparent=true'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1315, defaultVisible: false, reliability: 'fragile' },
  { id: 'swisstopo-cycling', title: 'Swisstopo Cycling', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-cycling', ['https://wmts.geo.admin.ch/1.0.0/ch.astra.veloland/default/current/3857/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1320, defaultVisible: false, reliability: 'fragile' },
  { id: 'swisstopo-cycling-closures', title: 'Swisstopo Cycling Closures', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-cycling-closures', ['https://wms.geo.admin.ch/?version=1.3.0&service=WMS&request=GetMap&sld_version=1.1.0&layers=ch.astra.veloland-sperrungen_umleitungen&format=image/png&STYLE=default&bbox={bbox-epsg-3857}&width=256&height=256&crs=EPSG:3857&transparent=true'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1325, defaultVisible: false, reliability: 'fragile' },
  { id: 'swisstopo-mtb', title: 'Swisstopo MTB', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-mtb', ['https://wmts.geo.admin.ch/1.0.0/ch.astra.mountainbikeland/default/current/3857/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1330, defaultVisible: false, reliability: 'fragile' },
  { id: 'swisstopo-mtb-closures', title: 'Swisstopo MTB Closures', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-mtb-closures', ['https://wms.geo.admin.ch/?version=1.3.0&service=WMS&request=GetMap&sld_version=1.1.0&layers=ch.astra.mountainbikeland-sperrungen_umleitungen&format=image/png&STYLE=default&bbox={bbox-epsg-3857}&width=256&height=256&crs=EPSG:3857&transparent=true'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1335, defaultVisible: false, reliability: 'fragile' },
  { id: 'swisstopo-ski-touring', title: 'Swisstopo Ski Touring', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('swisstopo-ski-touring', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo-karto.skitouren/default/current/3857/{z}/{x}/{y}.png'], COMMON_ATTRIBUTION_SWISSTOPO, 18), attribution: COMMON_ATTRIBUTION_SWISSTOPO, groupId: 'country-overlays', subgroupId: 'switzerland', order: 1340, defaultVisible: false, reliability: 'fragile' },
  { id: 'ign-fr-cadastre', title: 'IGN France Cadastre', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('ign-fr-cadastre', ['https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&LAYER=CADASTRALPARCELS.PARCELS&FORMAT=image/png&STYLE=normal'], COMMON_ATTRIBUTION_IGN, 18), attribution: COMMON_ATTRIBUTION_IGN, groupId: 'country-overlays', subgroupId: 'france', order: 1350, defaultVisible: false, reliability: 'fragile', defaultOpacity: 0.5 },
  { id: 'ign-fr-slope', title: 'IGN France Slope', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('ign-fr-slope', ['https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TileMatrixSet=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&Layer=GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN&FORMAT=image/png&Style=normal'], COMMON_ATTRIBUTION_IGN, 18), attribution: COMMON_ATTRIBUTION_IGN, groupId: 'country-overlays', subgroupId: 'france', order: 1360, defaultVisible: false, reliability: 'fragile', defaultOpacity: 0.4 },
  { id: 'ign-fr-ski-touring', title: 'IGN France Ski Touring', kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', style: rasterStyle('ign-fr-ski-touring', ['https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TileMatrixSet=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&Layer=TRACES.RANDO.HIVERNALE&FORMAT=image/png&Style=normal'], COMMON_ATTRIBUTION_IGN, 18), attribution: COMMON_ATTRIBUTION_IGN, groupId: 'country-overlays', subgroupId: 'france', order: 1370, defaultVisible: false, reliability: 'fragile' },
]

export const mapLayerGroups: MapLayerGroupData[] = flattenLayerTree(mapLayerTree)

export const defaultAvailableMapLayerIds = mapLayers
  .filter((layer) => layer.defaultVisible && layer.reliability !== 'broken')
  .map((layer) => layer.id)

export function getAvailableMapLayers(availability: { availableLayerIds: string[]; showExperimentalLayers: boolean; showFragileLayers: boolean }) {
  const availableIds = new Set(availability.availableLayerIds)
  return [...mapLayers]
    .sort((a, b) => a.order - b.order)
    .filter((layer) => {
      if (!availableIds.has(layer.id)) return false
      if (layer.reliability === 'broken') return false
      if (layer.reliability === 'experimental' && !availability.showExperimentalLayers) return false
      if (layer.reliability === 'fragile' && !availability.showFragileLayers && !layer.defaultVisible) return false
      return true
    })
}

export function getAvailableMapLayerGroups(availability: { availableLayerIds: string[]; showExperimentalLayers: boolean; showFragileLayers: boolean }): MapLayerGroupWithLayers[] {
  const layers = getAvailableMapLayers(availability)
  const result: MapLayerGroupWithLayers[] = []
  for (const node of mapLayerTree) {
    const hasSubgroupChildren = node.children.some((child) =>
      layers.some((l) => l.groupId === node.id && l.subgroupId === child.id),
    )
    for (const child of node.children) {
      const childLayers = hasSubgroupChildren
        ? layers.filter((l) => l.groupId === node.id && l.subgroupId === child.id)
        : layers.filter((l) => l.groupId === child.id && !l.subgroupId)
      if (childLayers.length > 0) {
        result.push({ group: child, layers: childLayers })
      }
    }
  }
  return result
}

export function flattenLayerTree(tree: MapLayerTreeNode[]): MapLayerGroupData[] {
  const result: MapLayerGroupData[] = []
  for (const node of tree) {
    result.push({ id: node.id, title: node.title, order: node.order })
    if (node.children.length > 0) result.push(...flattenLayerTree(node.children))
  }
  return result
}

export function findMapLayerTreeNode(tree: MapLayerTreeNode[], id: string): MapLayerTreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children.length > 0) {
      const found = findMapLayerTreeNode(node.children, id)
      if (found !== null) return found
    }
  }
  return null
}

export function findMapLayer(layerId: string): MapLayerData | null {
  return mapLayers.find((layer) => layer.id === layerId) ?? null
}

export function validateMapLayers(): void {
  const ids = new Set<string>()
  const knownGroupIds = new Set<string>()
  const knownSubgroupIds = new Map<string, Set<string>>()
  for (const node of mapLayerTree) {
    knownGroupIds.add(node.id)
    const subs = new Set<string>()
    for (const child of node.children) subs.add(child.id)
    knownSubgroupIds.set(node.id, subs)
  }
  for (const layer of mapLayers) {
    if (ids.has(layer.id)) throw new Error(`Duplicate map layer id: ${layer.id}`)
    if (!knownGroupIds.has(layer.groupId)) throw new Error(`Unknown group ${layer.groupId} for map layer ${layer.id}`)
    if (layer.subgroupId !== undefined) {
      const subs = knownSubgroupIds.get(layer.groupId)
      if (subs === undefined || !subs.has(layer.subgroupId)) throw new Error(`Unknown subgroup ${layer.subgroupId} in group ${layer.groupId} for map layer ${layer.id}`)
    }
    if (!Number.isFinite(layer.order)) throw new Error(`Invalid order for map layer ${layer.id}`)
    if (layer.attribution.trim() === '') throw new Error(`Missing attribution for map layer ${layer.id}`)
    ids.add(layer.id)
  }
}

function rasterStyle(id: string, tiles: string[], attribution: string, maxzoom: number, tileSize = 256): StyleSpecification {
  return {
    version: 8,
    sources: { [id]: { type: 'raster', tiles, tileSize, maxzoom, attribution } },
    layers: [{ id, type: 'raster', source: id }],
  } as StyleSpecification
}
