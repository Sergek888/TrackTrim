export const TRACKS_SOURCE_ID = 'tracks'
export const TRACKS_LAYER_ID = 'track-lines'
export const ACTIVE_TRACKS_LAYER_ID = 'active-track-lines'
export const TRACK_MARKERS_SOURCE_ID = 'track-markers'
export const TRACK_MARKERS_LAYER_ID = 'track-markers-symbols'
export const TRACK_START_IMAGE_ID = 'track-start'
export const TRACK_FINISH_IMAGE_ID = 'track-finish'

export const OSM_LAYER_ID = 'osm'
export const TOPOGRAPHIC_LAYER_ID = 'topographic'
export const SATELLITE_LAYER_ID = 'satellite'
export const HILLSHADE_LAYER_ID = 'hillshade'
export const MAP_LABELS_LAYER_ID = 'map-labels'
export const CONTOURS_LAYER_ID = 'contours'

export const INTERACTIVE_TRACK_LAYER_IDS = [
  ACTIVE_TRACKS_LAYER_ID,
  TRACKS_LAYER_ID,
] as const
