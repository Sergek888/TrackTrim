import type { MapLayerAvailabilitySettings } from '../model/MapLayerAvailability'

export const defaultMapLayerAvailability: MapLayerAvailabilitySettings = {
  enabledLayerIds: ['osm', 'opentopomap', 'cyclosm', 'esri-satellite', 'waymarked-hiking', 'waymarked-cycling', 'osm-gps-traces', 'mapterhorn-hillshade'],
  hiddenLayerIds: [], enabledGroupIds: ['base', 'topo', 'satellite', 'relief', 'routes', 'activity'], showExperimentalLayers: false, showFragileLayers: false,
}
