import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl'
import { mapVisualProfiles, type MapLayerData } from './mapLayers'
import type { ActiveMapLayerState } from './mapSettings'
import { getMapLayer } from './mapSettings'

type MapLayerDefinition = MapLayerData
type InlineStyleLayer = Exclude<MapLayerDefinition, { kind: 'vector-base' | 'vector-overlay' }>
type PaintableLayerType = Exclude<LayerSpecification['type'], 'custom'>

type RuntimeLayerComposition = {
  sources: StyleSpecification['sources']
  layers: LayerSpecification[]
  paintLayerIdsByLayerId: Map<string, string[]>
}

const EMPTY_SOURCE_ID = 'empty-source'
const MAP_LAYER_ANCHORS = { reliefEnd: 'anchor-relief-end', overlayEnd: 'anchor-overlay-end', trackEnd: 'anchor-track-end', markerEnd: 'anchor-marker-end', interactionEnd: 'anchor-interaction-end', tooltipEnd: 'anchor-tooltip-end' } as const
const emptySource: maplibregl.GeoJSONSourceSpecification = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }

export class MapStyleManager {
  private readonly styleCache = new Map<string, StyleSpecification>()
  private readonly paintLayerIdsByLayerId = new Map<string, string[]>()
  private currentLayerStackKey: string | null = null
  private applyVersion = 0

  constructor(private map: maplibregl.Map, private restoreRuntimeLayers: () => void) {
    this.map.on('error', (event) => console.warn('[map-style]', event.error ?? event))
  }

  async applyState(state: ActiveMapLayerState): Promise<void> {
    const version = ++this.applyVersion
    const base = getMapLayer(state.baseLayerId) ?? getMapLayer('liberty-topo') ?? getMapLayer('osm-raster')
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
    for (const styleLayerId of this.paintLayerIdsByLayerId.get(layerId) ?? [layerId]) this.applyManagedLayerOpacity(styleLayerId, null, opacity)
  }

  private async buildBaseStyle(base: Extract<MapLayerDefinition, { role: 'base' }>, state: ActiveMapLayerState): Promise<StyleSpecification> {
    const style = base.kind === 'vector-base'
      ? await this.readRemoteStyle(base.id, base.styleUrl)
      : this.applyVisualProfile(this.readInlineStyle(base), base, state.opacityByLayerId[base.id])
    ensureApplicationAnchors(style)
    return style
  }

  private async composeRuntimeLayers(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState): Promise<RuntimeLayerComposition> {
    const sources: StyleSpecification['sources'] = {}
    const styleLayers: LayerSpecification[] = []
    const paintLayerIdsByLayerId = new Map<string, string[]>()

    for (const layer of layers) {
      if (layer.kind === 'vector-base') continue
      const raw = layer.kind === 'vector-overlay' ? await this.readRemoteStyle(layer.id, layer.styleUrl) : this.readInlineStyle(layer)
      const styled = this.applyVisualProfile(raw, layer, state.opacityByLayerId[layer.id])
      Object.assign(sources, styled.sources)
      styleLayers.push(...(styled.layers ?? []))
      paintLayerIdsByLayerId.set(layer.id, managedPaintLayerIds(styled.layers ?? []))
    }

    return { sources, layers: styleLayers, paintLayerIdsByLayerId }
  }

  private addRuntimeComposition(composition: RuntimeLayerComposition): void {
    for (const [sourceId, source] of Object.entries(composition.sources ?? {})) if (this.map.getSource(sourceId) === undefined) this.map.addSource(sourceId, source as SourceSpecification)
    for (const layer of composition.layers) if (this.map.getLayer(layer.id) === undefined) this.map.addLayer(layer, MAP_LAYER_ANCHORS.overlayEnd)
  }

  private rememberPaintLayerIds(next: Map<string, string[]>): void {
    this.paintLayerIdsByLayerId.clear()
    for (const [layerId, paintLayerIds] of next) this.paintLayerIdsByLayerId.set(layerId, paintLayerIds)
  }

  private applyLayerOpacities(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState): void {
    for (const layer of layers) {
      const opacity = state.opacityByLayerId[layer.id] ?? layer.defaultOpacity
      for (const styleLayerId of this.paintLayerIdsByLayerId.get(layer.id) ?? []) this.applyManagedLayerOpacity(styleLayerId, layer, opacity)
    }
  }

  private applyManagedLayerOpacity(styleLayerId: string, layer: MapLayerDefinition | null, opacity: number): void {
    const styleLayer = this.map.getLayer(styleLayerId)
    if (styleLayer === undefined || styleLayer.type === 'custom') return
    applyPaintOpacity((property, value) => this.map.setPaintProperty(styleLayerId, property, value), styleLayer.type, opacity, layer)
  }

  private applyVisualProfile(style: StyleSpecification, layer: MapLayerDefinition, opacityOverride?: number): StyleSpecification {
    const profile = layer.visualProfileId === undefined ? undefined : mapVisualProfiles[layer.visualProfileId as keyof typeof mapVisualProfiles]
    const opacity = opacityOverride ?? layer.defaultOpacity
    const layers = (style.layers ?? []).map((entry) => {
      const next = structuredClone(entry) as LayerSpecification
      if (next.type === 'custom') return next
      next.paint = { ...(next.paint ?? {}) }
      applyPaintOpacity((property, value) => { ;(next.paint as Record<string, unknown>)[property] = value }, next.type, opacity, layer)
      if (next.type === 'raster') {
        ;(next.paint as Record<string, unknown>)['raster-contrast'] = profile !== undefined && 'raster' in profile ? profile.raster?.contrast ?? 0 : 0
        ;(next.paint as Record<string, unknown>)['raster-saturation'] = profile !== undefined && 'raster' in profile ? profile.raster?.saturation ?? 0 : 0
        ;(next.paint as Record<string, unknown>)['raster-brightness-min'] = profile !== undefined && 'raster' in profile ? profile.raster?.brightnessMin ?? 0 : 0
        ;(next.paint as Record<string, unknown>)['raster-brightness-max'] = profile !== undefined && 'raster' in profile ? profile.raster?.brightnessMax ?? 1 : 1
        ;(next.paint as Record<string, unknown>)['raster-resampling'] = profile !== undefined && 'raster' in profile ? profile.raster?.resampling ?? 'linear' : 'linear'
      }
      if (next.type === 'hillshade') {
        const hillshade = profile !== undefined && 'hillshade' in profile ? profile.hillshade : undefined
        ;(next.paint as Record<string, unknown>)['hillshade-shadow-color'] = hillshade?.shadowColor ?? 'rgba(30, 41, 59, 0.55)'
        ;(next.paint as Record<string, unknown>)['hillshade-highlight-color'] = hillshade?.highlightColor ?? 'rgba(255, 255, 255, 0.45)'
        ;(next.paint as Record<string, unknown>)['hillshade-accent-color'] = hillshade?.accentColor ?? 'rgba(100, 116, 139, 0.25)'
        ;(next.paint as Record<string, unknown>)['hillshade-illumination-direction'] = hillshade?.illuminationDirection ?? 315
        ;(next.paint as Record<string, unknown>)['hillshade-illumination-anchor'] = hillshade?.illuminationAnchor ?? 'viewport'
      }
      return next
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
    const style = normalizeRemoteStyle(await response.json() as StyleSpecification, styleUrl)
    this.styleCache.set(layerId, style)
    return structuredClone(style) as StyleSpecification
  }
}

function resolveRuntimeLayerStack(state: ActiveMapLayerState): MapLayerDefinition[] {
  return [...state.terrainLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'terrain'), ...state.overlayLayerIds.map((id) => getMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'overlay')].sort((a, b) => a.order - b.order)
}

function ensureApplicationAnchors(style: StyleSpecification): void {
  style.sources = { ...(style.sources ?? {}), [EMPTY_SOURCE_ID]: emptySource }
  const ids = new Set((style.layers ?? []).map((layer) => layer.id))
  style.layers = [...(style.layers ?? []), ...createAnchorLayers().filter((layer) => !ids.has(layer.id))]
}

function normalizeRemoteStyle(style: StyleSpecification, styleUrl: string): StyleSpecification {
  const base = new URL(styleUrl, window.location.href)
  const copy = structuredClone(style) as StyleSpecification
  if (typeof copy.sprite === 'string') copy.sprite = resolveRelativeUrl(copy.sprite, base)
  if (typeof copy.glyphs === 'string') copy.glyphs = resolveRelativeUrl(copy.glyphs, base)
  for (const source of Object.values(copy.sources ?? {})) {
    if (source === undefined || typeof source !== 'object') continue
    const item = source as Record<string, unknown>
    if (typeof item.url === 'string') item.url = resolveRelativeUrl(item.url, base)
    if (Array.isArray(item.tiles)) item.tiles = item.tiles.map((tile) => typeof tile === 'string' ? resolveRelativeUrl(tile, base) : tile)
  }
  return copy
}

function resolveRelativeUrl(value: string, base: URL): string {
  if (value.includes('://') || value.startsWith('//') || value.includes('{')) return value
  return new URL(value, base).toString()
}

function managedPaintLayerIds(layers: readonly LayerSpecification[]): string[] {
  return layers.filter((layer) => layer.type !== 'custom' && isPaintableLayerType(layer.type)).map((layer) => layer.id)
}

function isPaintableLayerType(type: LayerSpecification['type']): type is PaintableLayerType {
  return ['raster', 'hillshade', 'line', 'fill', 'circle', 'symbol'].includes(type)
}

function applyPaintOpacity(set: (property: string, value: unknown) => void, type: PaintableLayerType, opacity: number, layer: MapLayerDefinition | null): void {
  const value = clampOpacity(opacity)
  if (type === 'raster') set('raster-opacity', value)
  if (type === 'hillshade') {
    const profile = layer?.visualProfileId === undefined ? undefined : mapVisualProfiles[layer.visualProfileId as keyof typeof mapVisualProfiles]
    const hillshade = profile !== undefined && 'hillshade' in profile ? profile.hillshade : undefined
    set('hillshade-exaggeration', (hillshade?.exaggeration ?? 0.5) * value)
  }
  if (type === 'line') set('line-opacity', value)
  if (type === 'fill') set('fill-opacity', value)
  if (type === 'circle') set('circle-opacity', value)
  if (type === 'symbol') { set('icon-opacity', value); set('text-opacity', value) }
}

function clampOpacity(opacity: number): number { return Math.max(0, Math.min(1, opacity)) }

function createAnchorLayers(): LayerSpecification[] {
  return Object.values(MAP_LAYER_ANCHORS).map((id) => ({ id, type: 'symbol', source: EMPTY_SOURCE_ID }))
}
