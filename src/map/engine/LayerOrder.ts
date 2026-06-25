import type { LayerSpecification } from 'maplibre-gl'

export const MAP_LAYER_ANCHORS = {
  baseEnd: 'anchor-base-end', reliefEnd: 'anchor-relief-end', overlayEnd: 'anchor-overlay-end', routeOverlayEnd: 'anchor-route-overlay-end', trackEnd: 'anchor-track-end', markerEnd: 'anchor-marker-end', interactionEnd: 'anchor-interaction-end', tooltipEnd: 'anchor-tooltip-end',
} as const

export function createAnchorLayers(): LayerSpecification[] {
  return Object.values(MAP_LAYER_ANCHORS).map((id) => ({ id, type: 'background', paint: { 'background-opacity': 0 } }))
}
