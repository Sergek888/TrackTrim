import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl'
import { mapVisualProfiles } from './mapVisualProfiles'
import { type MapLayerData, findMapLayer, resolveLayerDefaults } from './mapLayerRegistry'
import type { ActiveMapLayerState } from './mapSettings'
import type { MapLayerLoadStatus } from './mapLayerStatus'

type MapLayerDefinition = MapLayerData
type InlineStyleLayer = Exclude<MapLayerDefinition, { kind: 'vector-base' | 'vector-overlay' }>
type PaintableLayerType = Extract<LayerSpecification['type'], 'raster' | 'hillshade' | 'line' | 'fill' | 'circle' | 'symbol'>
type RuntimeStyleLayer = { layer: LayerSpecification; beforeId: string }

type RuntimeLayerComposition = {
  sources: StyleSpecification['sources']
  layers: RuntimeStyleLayer[]
  paintLayerIdsByLayerId: Map<string, string[]>
  sourceIdsByLayerId: Map<string, string[]>
}

const EMPTY_SOURCE_ID = 'empty-source'
export const MAP_LAYER_ANCHORS = { reliefEnd: 'anchor-relief-end', overlayEnd: 'anchor-overlay-end', trackEnd: 'anchor-track-end', markerEnd: 'anchor-marker-end', interactionEnd: 'anchor-interaction-end', tooltipEnd: 'anchor-tooltip-end' } as const
const emptySource: maplibregl.GeoJSONSourceSpecification = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }

export class MapStyleManager {
  private readonly styleCache = new Map<string, StyleSpecification>()
  private readonly paintLayerIdsByLayerId = new Map<string, string[]>()
  private readonly sourceIdsByLayerId = new Map<string, string[]>()
  private currentBaseId: string | null = null
  private currentRuntimeIds = new Set<string>()
  private applyVersion = 0
  private currentLanguage = 'en'

  constructor(
    private map: maplibregl.Map,
    private restoreRuntimeLayers: (appliedBaseLayerId: string) => void,
    private onStatusChange?: (layerId: string, status: MapLayerLoadStatus) => void,
  ) {
    this.map.on('error', (event) => console.warn('[map-style]', event.error ?? event))
    this.map.on('styleimagemissing', (event) => {
      const id = (event as { id?: string }).id
      if (id === undefined || this.map.hasImage(id)) return
      this.map.addImage(id, { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) })
    })
  }

  // Style application paths:
  // 1. No changes → applyLayerOpacities only (no setStyle)
  // 2. Overlay/terrain changed, base same → applyOverlayDiff (incremental add/remove, no setStyle)
  // 3. Base changed → full setStyle rebuild
  async applyState(state: ActiveMapLayerState, language?: string): Promise<void> {
    const nextLanguage = language ?? this.currentLanguage
    const languageChanged = nextLanguage !== this.currentLanguage
    this.currentLanguage = nextLanguage
    const version = ++this.applyVersion
    const requestedBase = findMapLayer(state.baseLayerId) ?? findMapLayer('liberty-topo') ?? findMapLayer('osm-raster')
    if (requestedBase === null || requestedBase.role !== 'base') throw new Error('No default base map is registered')

    const runtimeLayers = resolveRuntimeLayerStack(state)
    const nextRuntimeIds = new Set(runtimeLayers.map((l) => l.id))
    const baseChanged = this.currentBaseId !== requestedBase.id
    const runtimeChanged = !setsEqual(this.currentRuntimeIds, nextRuntimeIds)

    if (!baseChanged && !runtimeChanged && !languageChanged && this.map.isStyleLoaded()) {
      this.applyLayerOpacities(runtimeLayers, state)
      return
    }

    if (!baseChanged && !languageChanged && runtimeChanged && this.currentBaseId !== null && this.map.isStyleLoaded()) {
      const removed = setDifference(this.currentRuntimeIds, nextRuntimeIds)
      const added = runtimeLayers.filter((l) => !this.currentRuntimeIds.has(l.id))
      await this.applyOverlayDiff(state, added, removed, runtimeLayers, version)
      return
    }

    let baseStyle: StyleSpecification
    let runtimeComposition: RuntimeLayerComposition
    let appliedBase = requestedBase
    try {
      runtimeComposition = await this.composeRuntimeLayers(runtimeLayers, state)
      baseStyle = await this.buildBaseStyle(requestedBase, state)
    } catch (error) {
      console.warn('[map-style] Failed to load style, falling back to osm-raster:', error)
      const fallback = findMapLayer('osm-raster')
      if (fallback === null || fallback.role !== 'base') return
      runtimeComposition = await this.composeRuntimeLayers(runtimeLayers, state)
      baseStyle = await this.buildBaseStyle(fallback, state)
      appliedBase = fallback
    }
    if (version !== this.applyVersion) return

    await new Promise<void>((resolve) => {
      this.map.once('style.load', () => {
        if (version === this.applyVersion) {
          this.addRuntimeComposition(runtimeComposition)
          this.currentBaseId = appliedBase.id
          this.currentRuntimeIds = nextRuntimeIds
          this.rememberComposition(runtimeComposition)
          this.restoreRuntimeLayers(appliedBase.id)
        }
        resolve()
      })
      this.map.setStyle(baseStyle)
    })
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    for (const styleLayerId of this.paintLayerIdsByLayerId.get(layerId) ?? [layerId]) this.applyManagedLayerOpacity(styleLayerId, null, opacity)
  }

  private async applyOverlayDiff(
    state: ActiveMapLayerState,
    added: readonly MapLayerDefinition[],
    removed: ReadonlySet<string>,
    runtimeLayers: readonly MapLayerDefinition[],
    version: number,
  ): Promise<void> {
    for (const layerId of removed) this.removeOverlayLayers(layerId)

    if (added.length > 0) {
      const addedComposition = await this.composeRuntimeLayers(added, state, true)
      if (version !== this.applyVersion) return
      this.addRuntimeComposition(addedComposition)
      for (const [layerId, paintIds] of addedComposition.paintLayerIdsByLayerId) this.paintLayerIdsByLayerId.set(layerId, paintIds)
      for (const [layerId, sourceIds] of addedComposition.sourceIdsByLayerId) this.sourceIdsByLayerId.set(layerId, sourceIds)
    }

    this.currentRuntimeIds = new Set(runtimeLayers.map((l) => l.id))
    this.applyLayerOpacities(runtimeLayers, state)
    this.restoreRuntimeLayers(this.currentBaseId ?? state.baseLayerId)
  }

  private removeOverlayLayers(layerId: string): void {
    for (const styleLayerId of this.paintLayerIdsByLayerId.get(layerId) ?? []) {
      if (this.map.getLayer(styleLayerId) !== undefined) this.map.removeLayer(styleLayerId)
    }
    for (const sourceId of this.sourceIdsByLayerId.get(layerId) ?? []) {
      if (this.map.getSource(sourceId) !== undefined) this.map.removeSource(sourceId)
    }
    this.paintLayerIdsByLayerId.delete(layerId)
    this.sourceIdsByLayerId.delete(layerId)
  }

  private async buildBaseStyle(base: Extract<MapLayerDefinition, { role: 'base' }>, state: ActiveMapLayerState): Promise<StyleSpecification> {
    const style = base.kind === 'vector-base'
      ? structuredClone(await this.readRemoteStyle(base.id, base.styleUrl)) as StyleSpecification
      : this.applyVisualProfile(this.readInlineStyle(base), base, state.opacityByLayerId[base.id])
    ensureApplicationAnchors(style)
    return style
  }

  private async composeRuntimeLayers(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState, safe = false): Promise<RuntimeLayerComposition> {
    const sources: StyleSpecification['sources'] = {}
    const styleLayers: RuntimeStyleLayer[] = []
    const paintLayerIdsByLayerId = new Map<string, string[]>()
    const sourceIdsByLayerId = new Map<string, string[]>()

    for (const layer of layers) {
      if (layer.kind === 'vector-base') continue
      const process = async () => {
        const raw = layer.kind === 'vector-overlay' ? await this.readRemoteStyle(layer.id, layer.styleUrl) : this.readInlineStyle(layer)
        const styled = this.applyVisualProfile(namespaceRuntimeStyle(raw, layer.id), layer, state.opacityByLayerId[layer.id])
        const layerSourceIds = Object.keys(styled.sources)
        Object.assign(sources, styled.sources)
        const beforeId = layer.role === 'terrain' ? MAP_LAYER_ANCHORS.reliefEnd : MAP_LAYER_ANCHORS.overlayEnd
        styleLayers.push(...(styled.layers ?? []).map((styleLayer) => ({ layer: styleLayer, beforeId })))
        paintLayerIdsByLayerId.set(layer.id, managedPaintLayerIds(styled.layers ?? []))
        sourceIdsByLayerId.set(layer.id, layerSourceIds)
      }
      if (safe) {
        try { await process() } catch (error) { console.warn(`[map-style] Skipping layer ${layer.id}:`, error) }
      } else {
        await process()
      }
    }

    return { sources, layers: styleLayers, paintLayerIdsByLayerId, sourceIdsByLayerId }
  }

  private addRuntimeComposition(composition: RuntimeLayerComposition): void {
    for (const [sourceId, source] of Object.entries(composition.sources ?? {})) if (this.map.getSource(sourceId) === undefined) this.map.addSource(sourceId, source as SourceSpecification)
    for (const { layer, beforeId } of composition.layers) if (this.map.getLayer(layer.id) === undefined) this.map.addLayer(layer, beforeId)
  }

  private rememberComposition(composition: RuntimeLayerComposition): void {
    this.paintLayerIdsByLayerId.clear()
    for (const [layerId, paintIds] of composition.paintLayerIdsByLayerId) this.paintLayerIdsByLayerId.set(layerId, paintIds)
    this.sourceIdsByLayerId.clear()
    for (const [layerId, sourceIds] of composition.sourceIdsByLayerId) this.sourceIdsByLayerId.set(layerId, sourceIds)
  }

  private applyLayerOpacities(layers: readonly MapLayerDefinition[], state: ActiveMapLayerState): void {
    for (const layer of layers) {
      const opacity = state.opacityByLayerId[layer.id] ?? resolveLayerDefaults(layer).defaultOpacity
      for (const styleLayerId of this.paintLayerIdsByLayerId.get(layer.id) ?? []) this.applyManagedLayerOpacity(styleLayerId, layer, opacity)
    }
  }

  private applyManagedLayerOpacity(styleLayerId: string, layer: MapLayerDefinition | null, opacity: number): void {
    const styleLayer = this.map.getLayer(styleLayerId)
    if (styleLayer === undefined || !isPaintableLayerType(styleLayer.type)) return
    applyPaintOpacity((property, value) => this.map.setPaintProperty(styleLayerId, property, value), styleLayer.type, opacity, layer)
  }

  private applyVisualProfile(style: StyleSpecification, layer: MapLayerDefinition, opacityOverride?: number): StyleSpecification {
    const profile = resolveVisualProfile(layer)
    const opacity = opacityOverride ?? resolveLayerDefaults(layer).defaultOpacity
    const rasterProfile = getRasterProfile(profile)
    const hillshadeProfile = getHillshadeProfile(profile)
    const layers = (style.layers ?? []).map((entry) => {
      const next = structuredClone(entry) as LayerSpecification
      if (!isPaintableLayerType(next.type)) return next
      next.paint = { ...(next.paint ?? {}) }
      applyPaintOpacity((property, value) => { ;(next.paint as Record<string, unknown>)[property] = value }, next.type, opacity, layer)
      if (next.type === 'raster' && rasterProfile !== undefined) {
        const p = next.paint as Record<string, unknown>
        p['raster-contrast'] = rasterProfile.contrast ?? 0
        p['raster-saturation'] = rasterProfile.saturation ?? 0
        p['raster-brightness-min'] = rasterProfile.brightnessMin ?? 0
        p['raster-brightness-max'] = rasterProfile.brightnessMax ?? 1
        p['raster-resampling'] = rasterProfile.resampling ?? 'linear'
      }
      if (next.type === 'hillshade' && hillshadeProfile !== undefined) {
        const p = next.paint as Record<string, unknown>
        p['hillshade-shadow-color'] = hillshadeProfile.shadowColor ?? 'rgba(30, 41, 59, 0.55)'
        p['hillshade-highlight-color'] = hillshadeProfile.highlightColor ?? 'rgba(255, 255, 255, 0.45)'
        p['hillshade-accent-color'] = hillshadeProfile.accentColor ?? 'rgba(100, 116, 139, 0.25)'
        p['hillshade-illumination-direction'] = hillshadeProfile.illuminationDirection ?? 315
        p['hillshade-illumination-anchor'] = hillshadeProfile.illuminationAnchor ?? 'viewport'
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
    const cacheKey = `${layerId}:${this.currentLanguage}`
    const cached = this.styleCache.get(cacheKey)
    if (cached !== undefined) return cached
    this.emitStatus(layerId, 'loading')
    try {
      const fetchUrl = resolveProjectOwnedStyleUrl(styleUrl)
      const response = await fetch(fetchUrl)
      if (!response.ok) throw new Error(`Map style ${layerId} failed: ${response.status}`)
      const style = normalizeRemoteStyle(await response.json() as StyleSpecification, styleUrl, this.currentLanguage)
      this.styleCache.set(cacheKey, style)
      this.emitStatus(layerId, 'ready')
      return style
    } catch (error) {
      this.emitStatus(layerId, 'failed')
      throw error
    }
  }

  private emitStatus(layerId: string, status: MapLayerLoadStatus): void {
    this.onStatusChange?.(layerId, status)
  }
}

function resolveRuntimeLayerStack(state: ActiveMapLayerState): MapLayerDefinition[] {
  return [...state.terrainLayerIds.map((id) => findMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'terrain'), ...state.overlayLayerIds.map((id) => findMapLayer(id)).filter((layer): layer is MapLayerDefinition => layer?.role === 'overlay')].sort((a, b) => a.order - b.order)
}

function ensureApplicationAnchors(style: StyleSpecification): void {
  style.sources = { ...(style.sources ?? {}), [EMPTY_SOURCE_ID]: emptySource }
  const layers = [...(style.layers ?? [])]
  const ids = new Set(layers.map((layer) => layer.id))
  const anchors = createAnchorLayers().filter((layer) => !ids.has(layer.id))
  const reliefAnchor = anchors.find((layer) => layer.id === MAP_LAYER_ANCHORS.reliefEnd)
  const tailAnchors = anchors.filter((layer) => layer.id !== MAP_LAYER_ANCHORS.reliefEnd)

  if (reliefAnchor !== undefined) layers.splice(resolveReliefAnchorIndex(layers), 0, reliefAnchor)
  layers.push(...tailAnchors)
  style.layers = layers
}

function resolveProjectOwnedStyleUrl(styleUrl: string): string {
  if (styleUrl === 'https://styles.gpx.studio/liberty-topo.json') return '/map-styles/liberty-topo.json'
  if (styleUrl === 'https://styles.gpx.studio/osm.json') return '/map-styles/osm-vector.json'
  if (styleUrl === 'https://styles.gpx.studio/osm-topo.json') return '/map-styles/osm-topo-vector.json'
  if (styleUrl === 'https://maps.utagawavtt.com/styles/utagawavtt/style.json') return '/map-styles/utagawa-vtt.json'
  return styleUrl
}

function normalizeRemoteStyle(style: StyleSpecification, styleUrl: string, lang: string): StyleSpecification {
  const baseHref = typeof window === 'undefined' ? 'http://localhost/' : window.location.href
  const base = new URL(styleUrl, baseHref)
  const copy = { ...style, sources: { ...(style.sources ?? {}) }, layers: [...(style.layers ?? [])] } as StyleSpecification
  if (typeof copy.sprite === 'string') copy.sprite = resolveRelativeUrl(copy.sprite, base)
  if (typeof copy.glyphs === 'string') copy.glyphs = resolveRelativeUrl(copy.glyphs, base)
  for (const source of Object.values(copy.sources ?? {})) {
    if (source === undefined || typeof source !== 'object') continue
    const item = source as Record<string, unknown>
    if (typeof item.url === 'string') item.url = resolveRelativeUrl(item.url, base)
    if (Array.isArray(item.tiles)) item.tiles = item.tiles.map((tile) => typeof tile === 'string' ? resolveRelativeUrl(tile, base) : tile)
  }
  if (lang !== 'en') applyLanguageToLabels(copy, lang)
  return copy
}

function resolveRelativeUrl(value: string, base: URL): string {
  if (value.includes('://') || value.startsWith('//') || value.includes('{')) return value
  return new URL(value, base).toString()
}

function applyLanguageToLabels(style: StyleSpecification, lang: string): void {
  for (const layer of style.layers ?? []) {
    if (layer.type !== 'symbol') continue
    const layout = layer.layout as Record<string, unknown> | undefined
    if (layout === undefined) continue
    const textField = layout['text-field']
    if (!Array.isArray(textField)) continue
    layout['text-field'] = rewriteTextFieldForLang(textField, lang)
  }
}

function rewriteTextFieldForLang(textField: unknown[], lang: string): unknown[] {
  if (textField.length === 4 && Array.isArray(textField[3])) {
    const inner = textField[3]
    if (inner[0] === 'coalesce' && Array.isArray(inner[1]) && inner[1][0] === 'get' && typeof inner[1][1] === 'string' && inner[1][1].startsWith('name')) {
      return ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
    }
  }
  if (textField.length === 3 && textField[0] === 'coalesce' && Array.isArray(textField[1]) && textField[1][0] === 'get' && typeof textField[1][1] === 'string' && textField[1][1].startsWith('name')) {
    return ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
  }
  return textField
}

function resolveVisualProfile(layer: MapLayerDefinition | null) {
  if (layer === null) return undefined
  const { visualProfileId } = resolveLayerDefaults(layer)
  return mapVisualProfiles[visualProfileId as keyof typeof mapVisualProfiles]
}

function getRasterProfile(profile: ReturnType<typeof resolveVisualProfile>) {
  return profile !== undefined && 'raster' in profile ? profile.raster : undefined
}

function getHillshadeProfile(profile: ReturnType<typeof resolveVisualProfile>) {
  return profile !== undefined && 'hillshade' in profile ? profile.hillshade : undefined
}

function resolveReliefAnchorIndex(layers: readonly LayerSpecification[]): number {
  const firstContentLayerIndex = layers.findIndex((layer) => layer.type !== 'background')
  return firstContentLayerIndex === -1 ? layers.length : firstContentLayerIndex
}

function namespaceRuntimeStyle(style: StyleSpecification, layerId: string): StyleSpecification {
  const prefix = `${layerId}:`
  const sourceIds = new Set(Object.keys(style.sources ?? {}))
  const sources = Object.fromEntries(
    Object.entries(style.sources ?? {}).map(([sourceId, source]) => [`${prefix}${sourceId}`, source]),
  )
  const layers = (style.layers ?? []).map((entry) => {
    const next = structuredClone(entry) as LayerSpecification
    if ('source' in next && typeof next.source === 'string' && sourceIds.has(next.source)) next.source = `${prefix}${next.source}`
    next.id = `${prefix}${next.id}`
    return next
  })

  return { ...style, sources, layers }
}

function managedPaintLayerIds(layers: readonly LayerSpecification[]): string[] {
  return layers.filter((layer) => isPaintableLayerType(layer.type)).map((layer) => layer.id)
}

function isPaintableLayerType(type: string): type is PaintableLayerType {
  return ['raster', 'hillshade', 'line', 'fill', 'circle', 'symbol'].includes(type)
}

function applyPaintOpacity(set: (property: string, value: unknown) => void, type: PaintableLayerType, opacity: number, layer: MapLayerDefinition | null): void {
  const value = clampOpacity(opacity)
  switch (type) {
    case 'raster':
      set('raster-opacity', value)
      break
    case 'hillshade': {
      const profile = resolveVisualProfile(layer)
      const hillshade = getHillshadeProfile(profile)
      set('hillshade-exaggeration', (hillshade?.exaggeration ?? 0.5) * value)
      break
    }
    case 'line':
      set('line-opacity', value)
      break
    case 'fill':
      set('fill-opacity', value)
      break
    case 'circle':
      set('circle-opacity', value)
      break
    case 'symbol':
      set('icon-opacity', value)
      set('text-opacity', value)
      break
  }
}

function clampOpacity(opacity: number): number { return Math.max(0, Math.min(1, opacity)) }

function createAnchorLayers(): LayerSpecification[] {
  return Object.values(MAP_LAYER_ANCHORS).map((id) => ({ id, type: 'symbol', source: EMPTY_SOURCE_ID }))
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) if (!b.has(item)) return false
  return true
}

function setDifference(a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> {
  const result = new Set<string>()
  for (const item of a) if (!b.has(item)) result.add(item)
  return result
}
