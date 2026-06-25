import type { MapVisualProfile } from '../model/MapVisualProfile'

export const mapVisualProfiles: Record<string, MapVisualProfile> = {
  cleanRaster: { id: 'cleanRaster', title: 'Clean raster', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 1, saturation: 0, contrast: 0, resampling: 'linear' } },
  readableTopo: { id: 'readableTopo', title: 'Readable topo', raster: { opacity: 1, brightnessMin: 0.02, brightnessMax: 0.98, saturation: 0.05, contrast: 0.12, resampling: 'linear' } },
  satelliteForTracks: { id: 'satelliteForTracks', title: 'Satellite for tracks', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 0.9, saturation: -0.08, contrast: 0.08, resampling: 'linear' } },
  softHillshade: { id: 'softHillshade', title: 'Soft hillshade', hillshade: { exaggeration: 0.35, illuminationDirection: 315, illuminationAnchor: 'viewport' } },
}
