import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl'
import { mapVisualProfiles, type MapLayerData } from './mapLayers'
import type { ActiveMapLayerState } from './mapSettings'
import { getMapLayer } from './mapSettings'

type MapLayerDefinition = MapLayerData
type InlineStyleLayer = Exclude<MapLayerDefinition, { kind: 'vector-base' }>

type RuntimeLayerComposition = {
  sources: StyleSpecification['sources']
  layers: LayerSpecification[]
  paintLayerIdsByLayerId: Map<string, string[]>
}

const EMPTY_SOURCE_ID = 'empty-source'

const MAP_LAYER_ANCHORS = {
  reliefEnd: 'anchor-relief-end',
  overlayEnd: 'anchor-overlay-end',
  trackEnd: 'anchor-track-end',
  markerEnd: 'anchor-marker-end',
  interactionEnd: 'anchor-interaction-end',
  tooltipEnd: 'anchor-tooltip-end',
} as const

const emptySource: maplibregl.GeoJSONSourceSpecification = {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [],
  },
}

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

    const runtimeComposition = await this.composeRuntimeLayers(runtimeLayers, state)
    const baseStyle = await this.buildBaseStyle(base, state)

    if (version !== this.applyVersion) return

    await new Promise<void>((resolve) => {
      this.map.once('style.load', () => {
        if (version === this.applyVersion) {
          this.addRuntimeComposition(runtimeComposition)
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
    if (layer?.type === 'hillshade') this.map.setPaintProperty(layerId, 'hillshade-exaggeration', clampOpacity(opacity) * 0.5)
  }

  private async buildBaseStyle(base: Extract<MapLayerDefinition, { role: 'base' }>, state: ActiveMapLayerState): Promise<StyleSpecification> {
    const style = createEmptyApplicationStyle()
    const baseStyle = base.kind === 'vector-base'
      ? await this.readRemoteStyle(base.id, base.styleUrl)
      : this.applyVisualProfile(this.readInlineStyle(base), base, state.opacityByLayerId[base.id])

    mergeStyle(style, baseStyle)
    style.layers.push(...createAnchorLayers())
    return style
  }

  private async composeRuntimeLayers(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState): Promise<RuntimeLayerComposition> {
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

    for (const layer of composition.layers) {
      if (this.map.getLayer(layer.id) === undefined) {
        this.map.addLayer(layer, MAP_LAYER_ANCHORS.overlayEnd)
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
      this.map.setPaintProperty(styleLayerId, 'hillshade-exaggeration', (hillshade?.exaggeration ?? 0.5) * clampOpacity(opacity))
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
            'hillshade-exaggeration': (hillshade?.exaggeration ?? 0.5) * clampOpacity(opacity),
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

  private readInlineStyle(layer: InlineStyleLayer): StyleSpecification {
    const cached = this.styleCache.get(layer.id)
    if (cached !== undefined) return structuredClone(cached) as StyleSpecification

    const style = structuredClone(layer.style) as StyleSpecification
    this.styleCache.set(layer.id, style)
    return structuredClone(style) as StyleSpecification
  }

  private async readRemoteStyle(layerId: string, styleUrl: string): Promise<StyleSpecification> {
    const cached = this.styleCache.get(layerId)
    if (cached !== undefined) return structuredClone(cached) as StyleSpecification

    const response = await fetch(styleUrl, { cache: 'force-cache' })
    if (!response.ok) throw new Error(`Map style ${layerId} failed: ${response.status}`)
    const style = await response.json() as StyleSpecification
    this.styleCache.set(layerId, style)
    return structuredClone(style) as StyleSpecification
  }
}

function resolveRuntimeLayerStack(state: ActiveMapLayerState): MapLayerDefinition[] {
  return [
    ...state.terrainLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'terrain'),
    ...state.overlayLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'overlay'),
  ].sort((a, b) => a.order - b.order)
}

function createEmptyApplicationStyle(): StyleSpecification {
  return {
    version: 8,
    sources: { [EMPTY_SOURCE_ID]: emptySource },
    layers: [],
  }
}

function mergeStyle(target: StyleSpecification, source: StyleSpecification): void {
  Object.assign(target.sources, source.sources)
  target.layers.push(...(source.layers ?? []))
  if (target.sprite === undefined && source.sprite !== undefined) target.sprite = source.sprite
  if (target.glyphs === undefined && source.glyphs !== undefined) target.glyphs = source.glyphs
  if (target.projection === undefined && source.projection !== undefined) target.projection = source.projection
  if (target.terrain === undefined && source.terrain !== undefined) target.terrain = source.terrain
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
    type: 'symbol',
    source: EMPTY_SOURCE_ID,
  }))
}
