export interface MapVisualProfile {
  id: string
  title: string
  raster?: {
    opacity?: number
    brightnessMin?: number
    brightnessMax?: number
    saturation?: number
    contrast?: number
    resampling?: 'linear' | 'nearest'
  }
  hillshade?: {
    exaggeration?: number
    shadowColor?: string
    highlightColor?: string
    accentColor?: string
    illuminationDirection?: number
    illuminationAnchor?: 'map' | 'viewport'
  }
  track?: {
    lineWidth: number
    casingWidth: number
    selectedLineWidth: number
    selectedCasingWidth: number
    casingColorLight: string
    casingColorDark: string
  }
}
