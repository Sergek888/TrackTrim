import type { LngLatLike } from 'maplibre-gl'

export interface MapRuntimeState {
  hasManualPan: boolean
  lastAutoPosition: { center: LngLatLike; zoom: number } | null
  camera: { center: LngLatLike; zoom: number }
}

export function createMapRuntimeState(): MapRuntimeState {
  return {
    hasManualPan: false,
    lastAutoPosition: null,
    camera: { center: [10, 45], zoom: 4 },
  }
}

export function recordManualPan(state: MapRuntimeState): MapRuntimeState {
  return { ...state, hasManualPan: true }
}

export function recordAutoPosition(state: MapRuntimeState, center: LngLatLike, zoom: number): MapRuntimeState {
  return { ...state, hasManualPan: false, lastAutoPosition: { center, zoom }, camera: { center, zoom } }
}

export function updateCamera(state: MapRuntimeState, center: LngLatLike, zoom: number): MapRuntimeState {
  return { ...state, camera: { center, zoom } }
}

export function shouldAutoFit(state: MapRuntimeState): boolean {
  return !state.hasManualPan
}
