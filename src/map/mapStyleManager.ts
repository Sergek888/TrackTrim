import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl'
import { mapVisualProfiles, type MapLayerData } from './mapLayers'
import type { ActiveMapLayerState } from './mapSettings'
import { getMapLayer } from './mapSettings'

type MapLayerDefinition = MapLayerData
type RuntimeLayerComposition = {
  sources: StyleSpecification['sources']
  layers: LayerSpecification[]
  paintLayerIdsByLayerId: Map<string, string[]>
}

type BaseStyleComposition = RuntimeLayerComposition & {
  style: StyleSpecification
}

const MAP_LAYER_ANCHORS = {
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
  private readonly styleCache = new Map<string, StyleSpecification>()
  private readonly paintLayerIdsByLayerId = new Map<string, string[]>()
  private currentLayerStackKey: string | null = null
  private applyVersion = 0

  constructor(
    private map: maplibregl.Map,
    private restoreRuntimeLayers: () => void,
  ) {}

  async applyState(state: ActiveMapLayerState): Promise<void> {
    const version = ++this.applyVersion
    const base = getMapLayer(state.baseLayerId) ?? getMapLayer('osm')
    if (base === null || base.role !== 'base') throw new Error('No default base map is registered')

    const runtimeLayers = resolveRuntimeLayerStack(state)
    const layerStackKey = [base.id, ...runtimeLayers.map((layer) => layer.id)].join('|')

    if (this.currentLayerStackKey === layerStackKey && this.map.isStyleLoaded()) {
      this.applyLayerOpacities(runtimeLayers, state)
      return
    }

    const runtimeComposition = this.composeRuntimeLayers(runtimeLayers, state)
    const baseStyle = base.kind === 'vector-base'
      ? base.styleUrl
      : this.composeRasterBaseStyle(base, runtimeComposition, state)

    if (version !== this.applyVersion) return

    await new Promise<void>((resolve) => {
      this.map.once('style.load', () => {
        if (version === this.applyVersion) {
          if (base.kind === 'vector-base') {
            this.addRuntimeComposition(runtimeComposition)
          }
          this.currentLayerStackKey = layerStackKey
          this.rememberPaintLayerIds(runtimeComposition.paintLayerIdsByLayerId)
          this.restoreRuntimeLayers()
        }
        resolve()
      })
      this.map.setStyle(baseStyle)
    })
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.map.getLayer(layerId)
    if (layer?.type === 'raster') this.map.setPaintProperty(layerId, 'raster-opacity', clampOpacity(opacity))
    if (layer?.type === 'hillshade') this.map.setPaintProperty(layerId, 'hillshade-exaggeration', clampOpacity(opacity) * 0.35)
  }

  private composeRasterBaseStyle(base: Extract<MapLayerDefinition, { kind: 'raster-base' }>, runtimeComposition: RuntimeLayerComposition, state: ActiveMapLayerState): StyleSpecification {
    const baseComposition = this.composeRuntimeLayers([base], state)

    return {
      version: 8,
      sources: {
        ...baseComposition.sources,
        ...runtimeComposition.sources,
      },
      layers: [
        ...baseComposition.layers,
        ...runtimeComposition.layers,
        ...createAnchorLayers(),
      ],
    }
  }

  private composeRuntimeLayers(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState): RuntimeLayerComposition {
    const sources: StyleSpecification['sources'] = {}
    const styleLayers: LayerSpecification[] = []
    const paintLayerIdsByLayerId = new Map<string, string[]>()

    for (const layer of layers) {
      if (layer.kind === 'vector-base') continue
      const raw = this.readInlineStyle(layer)
      const styled = this.applyVisualProfile(raw, layer, state.opacityByLayerId[layer.id])
      Object.assign(sources, styled.sources)
      styleLayers.push(...(styled.layers ?? []))
      paintLayerIdsByLayerId.set(layer.id, managedPaintLayerIds(styled.layers ?? []))
    }

    return { sources, layers: styleLayers, paintLayerIdsByLayerId }
  }

  private addRuntimeComposition(composition: RuntimeLayerComposition): void {
    for (const [sourceId, source] of Object.entries(composition.sources ?? {})) {
      if (this.map.getSource(sourceId) === undefined) {
        this.map.addSource(sourceId, source as SourceSpecification)
      }
    }

    for (const layer of [...composition.layers, ...createAnchorLayers()]) {
      if (this.map.getLayer(layer.id) === undefined) {
        this.map.addLayer(layer)
      }
    }
  }

  private rememberPaintLayerIds(next: Map<string, string[]>): void {
    this.paintLayerIdsByLayerId.clear()
    for (const [layerId, paintLayerIds] of next) {
      this.paintLayerIdsByLayerId.set(layerId, paintLayerIds)
    }
  }

  private applyLayerOpacities(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState): void {
    for (const layer of layers) {
      const opacity = state.opacityByLayerId[layer.id] ?? layer.defaultOpacity
      for (const styleLayerId of this.paintLayerIdsByLayerId.get(layer.id) ?? []) {
        this.applyManagedLayerOpacity(styleLayerId, layer, opacity)
      }
    }
  }

  private applyManagedLayerOpacity(styleLayerId: string, layer: MapLayerDefinition, opacity: number): void {
    const styleLayer = this.map.getLayer(styleLayerId)
    if (styleLayer?.type === 'raster') {
      this.map.setPaintProperty(styleLayerId, 'raster-opacity', clampOpacity(opacity))
      return
    }

    if (styleLayer?.type === 'hillshade') {
      const profile = layer.visualProfileId === undefined ? undefined : mapVisualProfiles[layer.visualProfileId as keyof typeof mapVisualProfiles]
      const hillshade = profile !== undefined && 'hillshade' in profile ? profile.hillshade : undefined
      this.map.setPaintProperty(styleLayerId, 'hillshade-exaggeration', (hillshade?.exaggeration ?? 0.35) * clampOpacity(opacity))
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
            'raster-opacity': clampOpacity(opacity),
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
            'hillshade-exaggeration': (hillshade?.exaggeration ?? 0.35) * clampOpacity(opacity),
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

  private readInlineStyle(layer: Exclude<MapLayerDefinition, { kind: 'vector-base' }>): StyleSpecification {
    const cached = this.styleCache.get(layer.id)
    if (cached !== undefined) return structuredClone(cached) as StyleSpecification

    const style = structuredClone(layer.style) as StyleSpecification
    this.styleCache.set(layer.id, style)
    return structuredClone(style) as StyleSpecification
  }
}

function resolveRuntimeLayerStack(state: ActiveMapLayerState): MapLayerDefinition[] {
  return [
    ...state.terrainLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'terrain'),
    ...state.overlayLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'overlay'),
  ].sort((a, b) => a.order - b.order)
}

function managedPaintLayerIds(layers: readonly LayerSpecification[]): string[] {
  return layers
    .filter((layer) => layer.type === 'raster' || layer.type === 'hillshade')
    .map((layer) => layer.id)
}

function clampOpacity(opacity: number): number {
  return Math.max(0, Math.min(1, opacity))
}

function createAnchorLayers(): LayerSpecification[] {
  return Object.values(MAP_LAYER_ANCHORS).map((id) => ({
    id,
    type: 'background',
    paint: { 'background-opacity': 0 },
  }))
}
