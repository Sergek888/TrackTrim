export const TRACKS_SOURCE_ID = 'tracks'
export const TRACKS_LAYER_ID = 'track-lines'
export const ACTIVE_TRACKS_LAYER_ID = 'active-track-lines'
export const TRACK_MARKERS_SOURCE_ID = 'track-markers'
export const TRACK_MARKERS_LAYER_ID = 'track-markers-symbols'
export const TRACK_START_IMAGE_ID = 'track-start'
export const TRACK_FINISH_IMAGE_ID = 'track-finish'

export const OSM_LAYER_ID = 'osm'
export const OPENFREEMAP_BACKGROUND_LAYER_ID = 'openfreemap-background'
export const OPENFREEMAP_WATER_LAYER_ID = 'openfreemap-water'
export const OPENFREEMAP_LANDCOVER_LAYER_ID = 'openfreemap-landcover'
export const OPENFREEMAP_LANDUSE_LAYER_ID = 'openfreemap-landuse'
export const OPENFREEMAP_BOUNDARY_LAYER_ID = 'openfreemap-boundary'
export const OPENFREEMAP_BUILDING_LAYER_ID = 'openfreemap-building'
export const OPENFREEMAP_ROAD_LAYER_ID = 'openfreemap-road'
export const OPENFREEMAP_LABELS_LAYER_ID = 'openfreemap-labels'
export const TOPOGRAPHIC_LAYER_ID = 'topographic'
export const SATELLITE_LAYER_ID = 'satellite'
export const HILLSHADE_LAYER_ID = 'hillshade'
export const MAP_LABELS_LAYER_ID = 'map-labels'
export const CONTOURS_LAYER_ID = 'contours'
export const TERRAIN_SOURCE_ID = 'terrain-dem'

export const OPENFREEMAP_LAYER_IDS = [
  OPENFREEMAP_BACKGROUND_LAYER_ID,
  OPENFREEMAP_LANDCOVER_LAYER_ID,
  OPENFREEMAP_LANDUSE_LAYER_ID,
  OPENFREEMAP_WATER_LAYER_ID,
  OPENFREEMAP_BOUNDARY_LAYER_ID,
  OPENFREEMAP_BUILDING_LAYER_ID,
  OPENFREEMAP_ROAD_LAYER_ID,
  OPENFREEMAP_LABELS_LAYER_ID,
] as const

export const INTERACTIVE_TRACK_LAYER_IDS: string[] = [
  ACTIVE_TRACKS_LAYER_ID,
  TRACKS_LAYER_ID,
]
