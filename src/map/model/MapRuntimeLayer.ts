export interface ActiveMapLayerState {
  baseLayerId: string
  overlayLayerIds: string[]
  terrainLayerIds: string[]
  opacityByLayerId: Record<string, number>
  activePresetId?: string
}

export interface MapSettings {
  activeLayerState: ActiveMapLayerState
  layerAvailability: import('./MapLayerAvailability').MapLayerAvailabilitySettings
}
