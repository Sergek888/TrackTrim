export type TrackVisualMode = 'default' | 'lightBase' | 'darkBase' | 'satellite' | 'topo' | 'gradientSafe'

export interface MapLayerPreset {
  id: string
  title: string
  description?: string
  baseLayerId: string
  enabledOverlayLayerIds: string[]
  enabledTerrainLayerIds: string[]
  layerOpacityOverrides?: Record<string, number>
  trackVisualMode: TrackVisualMode
}
