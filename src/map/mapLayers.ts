import type { StyleSpecification } from 'maplibre-gl'

export type MapLayerRole = 'base' | 'overlay' | 'terrain'
export type MapLayerSourceType = 'raster' | 'vector' | 'hillshade'
export type MapLayerReliability = 'stable' | 'normal' | 'fragile' | 'experimental' | 'broken'
export type MapLayerKind = 'raster-base' | 'vector-base' | 'raster-overlay' | 'vector-overlay' | 'terrain'

type BaseMapLayerData = {
  id: string
  title: string
  groupId: string
  order: number
  attribution: string
  defaultOpacity: number
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

const RAW_STYLE_BASE = 'https://raw.githubusercontent.com/gpxstudio/gpx.studio/main/website/src/lib/assets/custom'

export const mapVisualProfiles: Record<string, MapVisualProfileData> = {
  cleanRaster: { id: 'cleanRaster', title: 'Clean raster', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 1, saturation: 0, contrast: 0, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(255,255,255,0.9)' } },
  readableTopo: { id: 'readableTopo', title: 'Readable topo', raster: { opacity: 1, brightnessMin: 0.02, brightnessMax: 0.98, saturation: 0.05, contrast: 0.12, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(255,255,255,0.92)' } },
  satelliteForTracks: { id: 'satelliteForTracks', title: 'Satellite for tracks', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 0.9, saturation: -0.08, contrast: 0.08, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(0,0,0,0.68)' } },
  softHillshade: { id: 'softHillshade', title: 'Soft hillshade', hillshade: { exaggeration: 0.5, illuminationDirection: 315, illuminationAnchor: 'viewport' } },
}

export const mapLayers: MapLayerData[] = [
  vectorBase('liberty-topo', 'Liberty Topo', 'https://styles.gpx.studio/liberty-topo.json', '© OpenStreetMap contributors', 80, 'topo', true, 'readableTopo'),
  vectorBase('liberty-satellite', 'Liberty Satellite', 'https://styles.gpx.studio/liberty-satellite.json', '© OpenStreetMap contributors', 90, 'satellite', true, 'satelliteForTracks'),
  vectorBase('osm-vector', 'OSM Vector', 'https://styles.gpx.studio/osm.json', '© OpenStreetMap contributors', 95, 'base', true, 'cleanRaster'),
  vectorBase('osm-topo-vector', 'OSM Topo Vector', 'https://styles.gpx.studio/osm-topo.json', '© OpenStreetMap contributors', 96, 'topo', true, 'readableTopo'),
  rasterBase('osm-raster', 'OpenStreetMap Raster', ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'], '© OpenStreetMap contributors', 100, 'base', true, 19, 'cleanRaster'),
  rasterBase('opentopomap', 'OpenTopoMap', ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], '© OpenTopoMap, © OpenStreetMap contributors', 110, 'topo', true, 17, 'readableTopo'),
  rasterBase('open-hiking-map', 'Open Hiking Map', ['https://maps.refuges.info/hiking/{z}/{x}/{y}.png'], '© sly, © OpenStreetMap contributors', 120, 'topo', true, 18, 'readableTopo'),
  rasterBase('cyclosm', 'CyclOSM', ['https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', 'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', 'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'], '© CyclOSM, © OpenStreetMap contributors', 130, 'base', true, 18, 'readableTopo'),
  vectorBase('utagawa-vtt', 'UtagawaVTT', 'https://maps.utagawavtt.com/styles/utagawavtt/style.json', '© UtagawaVTT, © OpenStreetMap contributors', 135, 'activity', true, 'readableTopo', 'fragile'),
  rasterBase('esri-satellite', 'ESRI Satellite', ['https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/tile/1.0.0/World_Imagery/default/default028mm/{z}/{y}/{x}.jpg'], '© Esri and contributors', 140, 'satellite', false, 19, 'satelliteForTracks', 'stable'),

  rasterBase('swisstopo-raster', 'Swisstopo Raster', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg'], '© swisstopo', 300, 'countries', false, 19, 'readableTopo', 'fragile', 128),
  vectorBase('swisstopo-vector', 'Swisstopo Vector', 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json', '© swisstopo', 305, 'countries', false, 'readableTopo', 'fragile'),
  vectorBase('swisstopo-satellite', 'Swisstopo Satellite', 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.imagerybasemap.vt/style.json', '© swisstopo', 306, 'countries', false, 'satelliteForTracks', 'fragile'),
  vectorBase('linz', 'LINZ Topographic', 'https://basemaps.linz.govt.nz/v1/styles/topographic-v2.json?api=d01fbtg0ar23gctac5m0jgyy2ds', '© LINZ CC BY 4.0', 308, 'countries', false, 'readableTopo', 'fragile'),
  rasterBase('linz-topo', 'LINZ Topo Raster', ['https://basemaps.linz.govt.nz/v1/tiles/topo-raster/WebMercatorQuad/{z}/{x}/{y}.webp?api=d01fbtg0ar23gctac5m0jgyy2ds'], '© LINZ CC BY 4.0', 310, 'countries', false, 16, 'readableTopo', 'fragile'),
  rasterBase('ign-belgium', 'IGN Belgium', ['https://cartoweb.wmts.ngi.be/1.0.0/topo/default/3857/{z}/{y}/{x}.png'], '© IGN/NGI', 320, 'countries', false, 17, 'readableTopo', 'fragile'),
  vectorBase('ign-fr-plan', 'IGN France Plan', `${RAW_STYLE_BASE}/ign-fr-plan.json`, 'IGN-F/Géoportail', 325, 'countries', false, 'readableTopo', 'fragile'),
  vectorBase('ign-fr-topo', 'IGN France Topo', `${RAW_STYLE_BASE}/ign-fr-topo.json`, 'IGN-F/Géoportail', 326, 'countries', false, 'readableTopo', 'fragile'),
  rasterBase('ign-fr-scan25', 'IGN France Scan 25', ['https://data.geopf.fr/private/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR&FORMAT=image/jpeg&STYLE=normal&apikey=ign_scan_ws'], 'IGN-F/Géoportail', 330, 'countries', false, 16, 'readableTopo', 'fragile'),
  vectorBase('ign-fr-satellite', 'IGN France Satellite', `${RAW_STYLE_BASE}/ign-fr-satellite.json`, 'IGN-F/Géoportail', 335, 'countries', false, 'satelliteForTracks', 'fragile'),
  rasterBase('ign-spain', 'IGN Spain', ['https://www.ign.es/wmts/mapa-raster?layer=MTN&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'], '© IGN Spain', 340, 'countries', false, 20, 'readableTopo', 'fragile'),
  rasterBase('ign-spain-satellite', 'IGN Spain Satellite', ['https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'], '© IGN Spain', 350, 'countries', false, 20, 'satelliteForTracks', 'fragile'),
  vectorBase('ordnance-survey', 'Ordnance Survey', 'https://api.os.uk/maps/vector/v1/vts/resources/styles?srs=3857&key=piCT8WysfuC3xLSUW7sGLfrAAJoYDvQz', '© Ordnance Survey', 355, 'countries', false, 'readableTopo', 'fragile'),
  rasterBase('norway-topo', 'Norway Topo', ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'], '© Geonorge', 360, 'countries', false, 20, 'readableTopo', 'fragile'),
  rasterBase('finland-topo', 'Finland Topo', ['https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts?layer=maastokartta&style=default&tilematrixset=WGS84_Pseudo-Mercator&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}&api-key=30cb768c-c968-493c-ae24-2b0b974ebd29'], '© Maanmittauslaitos', 370, 'countries', false, 18, 'readableTopo', 'fragile'),
  rasterBase('bg-mountains', 'BG Mountains', ['https://bgmtile.kade.si/{z}/{x}/{y}.png'], '© BG Mountains', 380, 'countries', false, 19, 'readableTopo', 'fragile'),
  rasterBase('usgs', 'USGS Topo', ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}?blankTile=false'], '© USGS', 390, 'countries', false, 16, 'readableTopo', 'fragile'),

  terrainLayer('mapterhorn-hillshade', 'Mapterhorn Hillshade', 'https://tiles.mapterhorn.com/tilejson.json', '© Mapterhorn', 700, 'relief', true, 0.35, 'normal'),
  rasterOverlay('waymarked-hiking', 'Waymarked Hiking Trails', ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'], '© Waymarked Trails, © OpenStreetMap contributors', 1000, 'routes', true, 0.85),
  rasterOverlay('waymarked-cycling', 'Waymarked Cycling Trails', ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'], '© Waymarked Trails, © OpenStreetMap contributors', 1010, 'routes', true, 0.8),
  rasterOverlay('waymarked-mtb', 'Waymarked MTB Trails', ['https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png'], '© Waymarked Trails, © OpenStreetMap contributors', 1020, 'routes', true, 0.8),
  rasterOverlay('waymarked-skating', 'Waymarked Skating Trails', ['https://tile.waymarkedtrails.org/skating/{z}/{x}/{y}.png'], '© Waymarked Trails, © OpenStreetMap contributors', 1030, 'routes', false, 0.8),
  rasterOverlay('waymarked-riding', 'Waymarked Horse Riding Trails', ['https://tile.waymarkedtrails.org/riding/{z}/{x}/{y}.png'], '© Waymarked Trails, © OpenStreetMap contributors', 1040, 'routes', false, 0.8),
  rasterOverlay('waymarked-winter', 'Waymarked Winter Trails', ['https://tile.waymarkedtrails.org/slopes/{z}/{x}/{y}.png'], '© Waymarked Trails, © OpenStreetMap contributors', 1050, 'routes', false, 0.8),
  vectorOverlay('bikerouter-gravel', 'BRouter Gravel', `${RAW_STYLE_BASE}/bikerouter-gravel.json`, '© BRouter, © OpenStreetMap contributors', 1055, 'routes', false, 0.8, 'fragile'),
  rasterOverlay('cyclosm-lite', 'CyclOSM Lite', ['https://a.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png', 'https://b.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png', 'https://c.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png'], '© CyclOSM, © OpenStreetMap contributors', 1060, 'routes', false, 0.8),
  rasterOverlay('openrailwaymap', 'OpenRailwayMap', ['https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'], '© OpenRailwayMap, © OpenStreetMap contributors', 1070, 'transport', false, 0.8),
  rasterOverlay('osm-gps-traces', 'OpenStreetMap GPS Traces', ['https://gps.tile.openstreetmap.org/lines/{z}/{x}/{y}.png'], '© OpenStreetMap public GPS traces', 1200, 'activity', false, 0.5),

  rasterOverlay('swisstopo-slope', 'Swisstopo Slope > 30°', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/{z}/{x}/{y}.png'], '© swisstopo', 1300, 'country-overlays', false, 0.4, 'fragile'),
  rasterOverlay('swisstopo-hiking', 'Swisstopo Hiking', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swisstlm3d-wanderwege/default/current/3857/{z}/{x}/{y}.png'], '© swisstopo', 1310, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('swisstopo-hiking-closures', 'Swisstopo Hiking Closures', ['https://wms.geo.admin.ch/?version=1.3.0&service=WMS&request=GetMap&sld_version=1.1.0&layers=ch.astra.wanderland-sperrungen_umleitungen&format=image/png&STYLE=default&bbox={bbox-epsg-3857}&width=256&height=256&crs=EPSG:3857&transparent=true'], '© swisstopo', 1315, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('swisstopo-cycling', 'Swisstopo Cycling', ['https://wmts.geo.admin.ch/1.0.0/ch.astra.veloland/default/current/3857/{z}/{x}/{y}.png'], '© swisstopo', 1320, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('swisstopo-cycling-closures', 'Swisstopo Cycling Closures', ['https://wms.geo.admin.ch/?version=1.3.0&service=WMS&request=GetMap&sld_version=1.1.0&layers=ch.astra.veloland-sperrungen_umleitungen&format=image/png&STYLE=default&bbox={bbox-epsg-3857}&width=256&height=256&crs=EPSG:3857&transparent=true'], '© swisstopo', 1325, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('swisstopo-mtb', 'Swisstopo MTB', ['https://wmts.geo.admin.ch/1.0.0/ch.astra.mountainbikeland/default/current/3857/{z}/{x}/{y}.png'], '© swisstopo', 1330, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('swisstopo-mtb-closures', 'Swisstopo MTB Closures', ['https://wms.geo.admin.ch/?version=1.3.0&service=WMS&request=GetMap&sld_version=1.1.0&layers=ch.astra.mountainbikeland-sperrungen_umleitungen&format=image/png&STYLE=default&bbox={bbox-epsg-3857}&width=256&height=256&crs=EPSG:3857&transparent=true'], '© swisstopo', 1335, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('swisstopo-ski-touring', 'Swisstopo Ski Touring', ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo-karto.skitouren/default/current/3857/{z}/{x}/{y}.png'], '© swisstopo', 1340, 'country-overlays', false, 0.8, 'fragile'),
  rasterOverlay('ign-fr-cadastre', 'IGN France Cadastre', ['https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&LAYER=CADASTRALPARCELS.PARCELS&FORMAT=image/png&STYLE=normal'], 'IGN-F/Géoportail', 1350, 'country-overlays', false, 0.5, 'fragile'),
  rasterOverlay('ign-fr-slope', 'IGN France Slope', ['https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TileMatrixSet=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&Layer=GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN&FORMAT=image/png&Style=normal'], 'IGN-F/Géoportail', 1360, 'country-overlays', false, 0.4, 'fragile'),
  rasterOverlay('ign-fr-ski-touring', 'IGN France Ski Touring', ['https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&TileMatrixSet=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&Layer=TRACES.RANDO.HIVERNALE&FORMAT=image/png&Style=normal'], 'IGN-F/Géoportail', 1370, 'country-overlays', false, 0.8, 'fragile'),
]

export const mapLayerGroups: MapLayerGroupData[] = [
  { id: 'base', title: 'Основные карты', order: 100 },
  { id: 'topo', title: 'Топографические карты', order: 200 },
  { id: 'satellite', title: 'Спутник', order: 300 },
  { id: 'activity', title: 'Активности', order: 350 },
  { id: 'countries', title: 'Карты стран', order: 400 },
  { id: 'relief', title: 'Рельеф', order: 500 },
  { id: 'routes', title: 'Маршруты и тропы', order: 600 },
  { id: 'transport', title: 'Транспорт', order: 700 },
  { id: 'country-overlays', title: 'Слои стран', order: 900 },
]

export const defaultAvailableMapLayerIds = mapLayers
  .filter((layer) => layer.defaultVisible && layer.reliability !== 'broken')
  .map((layer) => layer.id)

function vectorBase(id: string, title: string, styleUrl: string, attribution: string, order: number, groupId: string, defaultVisible: boolean, visualProfileId: string, reliability: MapLayerReliability = 'normal'): VectorBaseLayerData {
  return { id, title, kind: 'vector-base', role: 'base', sourceType: 'vector', groupId, order, styleUrl, attribution, defaultOpacity: 1, visualProfileId, reliability, defaultVisible }
}

function rasterBase(id: string, title: string, tiles: string[], attribution: string, order: number, groupId: string, defaultVisible: boolean, maxzoom: number, visualProfileId: string, reliability: MapLayerReliability = 'normal', tileSize = 256): RasterBaseLayerData {
  return { id, title, kind: 'raster-base', role: 'base', sourceType: 'raster', groupId, order, style: rasterStyle(id, tiles, attribution, maxzoom, tileSize), attribution, defaultOpacity: 1, visualProfileId, reliability, defaultVisible }
}

function rasterOverlay(id: string, title: string, tiles: string[], attribution: string, order: number, groupId: string, defaultVisible: boolean, defaultOpacity: number, reliability: MapLayerReliability = 'normal'): RasterOverlayLayerData {
  return { id, title, kind: 'raster-overlay', role: 'overlay', sourceType: 'raster', groupId, order, style: rasterStyle(id, tiles, attribution, 18), attribution, defaultOpacity, visualProfileId: 'cleanRaster', reliability, defaultVisible }
}

function vectorOverlay(id: string, title: string, styleUrl: string, attribution: string, order: number, groupId: string, defaultVisible: boolean, defaultOpacity: number, reliability: MapLayerReliability = 'normal'): VectorOverlayLayerData {
  return { id, title, kind: 'vector-overlay', role: 'overlay', sourceType: 'vector', groupId, order, styleUrl, attribution, defaultOpacity, visualProfileId: 'cleanRaster', reliability, defaultVisible }
}

function terrainLayer(id: string, title: string, tileJsonUrl: string, attribution: string, order: number, groupId: string, defaultVisible: boolean, defaultOpacity: number, reliability: MapLayerReliability): TerrainLayerData {
  return {
    id,
    title,
    kind: 'terrain',
    role: 'terrain',
    sourceType: 'hillshade',
    groupId,
    order,
    style: {
      version: 8,
      sources: { [id]: { type: 'raster-dem', url: tileJsonUrl } },
      layers: [{ id, type: 'hillshade', source: id, paint: { 'hillshade-exaggeration': 0.5 } }],
    } as StyleSpecification,
    attribution,
    defaultOpacity,
    visualProfileId: 'softHillshade',
    reliability,
    defaultVisible,
  }
}

function rasterStyle(id: string, tiles: string[], attribution: string, maxzoom: number, tileSize = 256): StyleSpecification {
  return {
    version: 8,
    sources: { [id]: { type: 'raster', tiles, tileSize, maxzoom, attribution } },
    layers: [{ id, type: 'raster', source: id }],
  } as StyleSpecification
}
