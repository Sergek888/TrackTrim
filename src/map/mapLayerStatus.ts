export type MapLayerLoadStatus = 'idle' | 'loading' | 'ready' | 'failed'

export type MapLayerStatusState = Record<string, MapLayerLoadStatus>

export function createLayerStatusState(): MapLayerStatusState {
  return {}
}

export function getLayerStatus(state: MapLayerStatusState, layerId: string): MapLayerLoadStatus {
  return state[layerId] ?? 'idle'
}

export function setLayerStatus(state: MapLayerStatusState, layerId: string, status: MapLayerLoadStatus): MapLayerStatusState {
  if (state[layerId] === status) return state
  return { ...state, [layerId]: status }
}
