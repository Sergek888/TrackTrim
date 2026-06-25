import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'
import { mapLayers, mapVisualProfiles } from './mapLayers'
import type { ActiveMapLayerState } from './mapSettings'
import { getMapLayer } from './mapSettings'

export type MapLayerDefinition = (typeof mapLayers)[number]
export type MapVisualProfile = (typeof mapVisualProfiles)[keyof typeof mapVisualProfiles]

export const MAP_LAYER_ANCHORS = {
  baseEnd: 'anchor-base-end',
  reliefEnd: 'anchor-relief-end',
  overlayEnd: 'anchor-overlay-end',
  routeOverlayEnd: 'anchor-route-overlay-end',
  trackEnd: 'anchor-track-end',
  markerEnd: 'anchor-marker-end',
  interactionEnd: 'anchor-interaction-end',
  tooltipEnd: 'anchor-tooltip-end',
} as const

export class MapStyleManager {
  constructor(
    private map: maplibregl.Map,
    private restoreRuntimeLayers: () => void,
  ) {}

  async applyState(state: ActiveMapLayerState): Promise<void> {
    const base = getMapLayer(state.baseLayerId) ?? getMapLayer('osm')
    if (base === null) throw new Error('No default base map is registered')

    const layers = [
      base,
      ...state.terrainLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'terrain'),
      ...state.overlayLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'overlay'),
    ].sort((a, b) => a.order - b.order)

    const style = await this.compose(layers, state)
    await new Promise<void>((resolve) => {
      this.map.once('style.load', () => {
        this.restoreRuntimeLayers()
        resolve()
      })
      this.map.setStyle(style)
    })
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.map.getLayer(layerId)
    if (layer?.type === 'raster') this.map.setPaintProperty(layerId, 'raster-opacity', opacity)
    if (layer?.type === 'hillshade') this.map.setPaintProperty(layerId, 'hillshade-exaggeration', opacity * 0.35)
  }

  private async compose(layers: MapLayerDefinition[], state: ActiveMapLayerState): Promise<StyleSpecification> {
    const sources: StyleSpecification['sources'] = {}
    const styleLayers: LayerSpecification[] = []

    for (const layer of layers) {
      const raw = await this.readStyle(layer)
      const styled = this.applyVisualProfile(raw, layer, state.opacityByLayerId[layer.id])
      Object.assign(sources, styled.sources)
      styleLayers.push(...(styled.layers ?? []))
    }

    return {
      version: 8,
      sources,
      layers: [...styleLayers, ...createAnchorLayers()],
    }
  }

  private applyVisualProfile(style: StyleSpecification, layer: MapLayerDefinition, opacityOverride?: number): StyleSpecification {
    const profile = layer.visualProfileId === undefined ? undefined : mapVisualProfiles[layer.visualProfileId as keyof typeof mapVisualProfiles]
    const opacity = opacityOverride ?? layer.defaultOpacity
    const layers = (style.layers ?? []).map((entry) => {
      if (entry.type === 'raster') {
        return {
          ...entry,
          paint: {
            ...entry.paint,
            'raster-opacity': opacity,
            'raster-contrast': profile !== undefined && 'raster' in profile ? profile.raster?.contrast ?? 0 : 0,
            'raster-saturation': profile !== undefined && 'raster' in profile ? profile.raster?.saturation ?? 0 : 0,
            'raster-brightness-min': profile !== undefined && 'raster' in profile ? profile.raster?.brightnessMin ?? 0 : 0,
            'raster-brightness-max': profile !== undefined && 'raster' in profile ? profile.raster?.brightnessMax ?? 1 : 1,
            'raster-resampling': profile !== undefined && 'raster' in profile ? profile.raster?.resampling ?? 'linear' : 'linear',
          },
        } as LayerSpecification
      }

      if (entry.type === 'hillshade') {
        const hillshade = profile !== undefined && 'hillshade' in profile ? profile.hillshade : undefined
        return {
          ...entry,
          paint: {
            ...entry.paint,
            'hillshade-exaggeration': (hillshade?.exaggeration ?? 0.35) * Math.max(0, Math.min(1, opacity)),
            'hillshade-shadow-color': hillshade?.shadowColor ?? 'rgba(30, 41, 59, 0.55)',
            'hillshade-highlight-color': hillshade?.highlightColor ?? 'rgba(255, 255, 255, 0.45)',
            'hillshade-accent-color': hillshade?.accentColor ?? 'rgba(100, 116, 139, 0.25)',
            'hillshade-illumination-direction': hillshade?.illuminationDirection ?? 315,
            'hillshade-illumination-anchor': hillshade?.illuminationAnchor ?? 'viewport',
          },
        } as LayerSpecification
      }

      return entry
    })

    return { ...style, layers }
  }

  private async readStyle(layer: MapLayerDefinition): Promise<StyleSpecification> {
    if (typeof layer.style !== 'string') return structuredClone(layer.style) as StyleSpecification
    const response = await fetch(layer.style)
    if (!response.ok) throw new Error(`Map style ${layer.id} failed: ${response.status}`)
    return await response.json() as StyleSpecification
  }
}

function createAnchorLayers(): LayerSpecification[] {
  return Object.values(MAP_LAYER_ANCHORS).map((id) => ({
    id,
    type: 'background',
    paint: { 'background-opacity': 0 },
  }))
}
