export interface MapVisualProfileData {
  id: string
  title: string
  raster?: { opacity?: number; brightnessMin?: number; brightnessMax?: number; saturation?: number; contrast?: number; resampling?: string }
  track?: { lineWidth?: number; casingWidth?: number; selectedLineWidth?: number; selectedCasingWidth?: number; casingColor?: string }
  hillshade?: { exaggeration?: number; shadowColor?: string; highlightColor?: string; accentColor?: string; illuminationDirection?: number; illuminationAnchor?: string }
}

export const mapVisualProfiles: Record<string, MapVisualProfileData> = {
  cleanRaster: { id: 'cleanRaster', title: 'Clean raster', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 1, saturation: 0, contrast: 0, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(255,255,255,0.9)' } },
  readableTopo: { id: 'readableTopo', title: 'Readable topo', raster: { opacity: 1, brightnessMin: 0.02, brightnessMax: 0.98, saturation: 0.05, contrast: 0.12, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(255,255,255,0.92)' } },
  satelliteForTracks: { id: 'satelliteForTracks', title: 'Satellite for tracks', raster: { opacity: 1, brightnessMin: 0, brightnessMax: 0.9, saturation: -0.08, contrast: 0.08, resampling: 'linear' }, track: { lineWidth: 4, casingWidth: 7, selectedLineWidth: 6, selectedCasingWidth: 10, casingColor: 'rgba(0,0,0,0.68)' } },
  softHillshade: { id: 'softHillshade', title: 'Soft hillshade', hillshade: { exaggeration: 0.5, illuminationDirection: 315, illuminationAnchor: 'viewport' } },
}
