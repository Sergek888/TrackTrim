import { defaultAvailableMapLayerIds, mapLayerTree, mapLayers, type MapLayerGroupWithLayers } from './mapLayers'

export interface ActiveMapLayerState {
  baseLayerId: string
  overlayLayerIds: string[]
  terrainLayerIds: string[]
  opacityByLayerId: Record<string, number>
}

export interface MapLayerAvailabilitySettings {
  availableLayerIds: string[]
  showExperimentalLayers: boolean
  showFragileLayers: boolean
}

export interface MapSettings {
  activeLayerState: ActiveMapLayerState
  layerAvailability: MapLayerAvailabilitySettings
  mapLanguage: string
}

type MapSettingsStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'trackviewer.map-settings.v4'
const DEFAULT_BASE_LAYER_ID = 'liberty-topo'

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  activeLayerState: {
    baseLayerId: DEFAULT_BASE_LAYER_ID,
    overlayLayerIds: [],
    terrainLayerIds: [],
    opacityByLayerId: {},
  },
  layerAvailability: {
    availableLayerIds: defaultAvailableMapLayerIds,
    showExperimentalLayers: false,
    showFragileLayers: false,
  },
  mapLanguage: detectBrowserLanguage(),
}

export function loadMapSettings(storage = getMapSettingsStorage()): MapSettings {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw === undefined || raw === null) return cloneDefaultMapSettings()
    return normalizeMapSettings(JSON.parse(raw) as Partial<MapSettings>)
  } catch {
    return cloneDefaultMapSettings()
  }
}

export function saveMapSettings(settings: MapSettings, storage = getMapSettingsStorage()): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(normalizeMapSettings(settings)))
}

export function normalizeMapSettings(settings: Partial<MapSettings>): MapSettings {
  const layerAvailability = normalizeLayerAvailability(settings.layerAvailability)
  const availableLayers = getAvailableMapLayers(layerAvailability)
  const available = new Set(availableLayers.map((layer) => layer.id))
  const active = settings.activeLayerState
  const fallbackBaseLayerId = resolveFallbackBaseLayerId(availableLayers)

  const baseLayerId = active?.baseLayerId !== undefined && available.has(active.baseLayerId)
    ? active.baseLayerId
    : fallbackBaseLayerId
  const overlayLayerIds = uniqueKnownIds(active?.overlayLayerIds ?? [], available)
  const terrainLayerIds = uniqueKnownIds(active?.terrainLayerIds ?? [], available)
  const opacityByLayerId = Object.fromEntries(
    Object.entries(active?.opacityByLayerId ?? {})
      .filter(([id, opacity]) => available.has(id) && Number.isFinite(opacity))
      .map(([id, opacity]) => [id, clampOpacity(opacity)]),
  )

  return {
    layerAvailability,
    mapLanguage: normalizeMapLanguage(settings.mapLanguage),
    activeLayerState: {
      baseLayerId,
      overlayLayerIds,
      terrainLayerIds,
      opacityByLayerId,
    },
  }
}

export function getAvailableMapLayers(availability: MapLayerAvailabilitySettings) {
  const availableIds = new Set(availability.availableLayerIds)
  return [...mapLayers]
    .sort((a, b) => a.order - b.order)
    .filter((layer) => {
      if (!availableIds.has(layer.id)) return false
      if (layer.reliability === 'broken') return false
      if (layer.reliability === 'experimental' && !availability.showExperimentalLayers) return false
      if (layer.reliability === 'fragile' && !availability.showFragileLayers && !layer.defaultVisible) return false
      return true
    })
}

export function getAvailableMapLayerGroups(availability: MapLayerAvailabilitySettings): MapLayerGroupWithLayers[] {
  const layers = getAvailableMapLayers(availability)
  const result: MapLayerGroupWithLayers[] = []
  for (const node of mapLayerTree) {
    const hasSubgroupChildren = node.children.some((child) =>
      layers.some((l) => l.groupId === node.id && l.subgroupId === child.id),
    )
    for (const child of node.children) {
      const childLayers = hasSubgroupChildren
        ? layers.filter((l) => l.groupId === node.id && l.subgroupId === child.id)
        : layers.filter((l) => l.groupId === child.id && !l.subgroupId)
      if (childLayers.length > 0) {
        result.push({ group: child, layers: childLayers })
      }
    }
  }
  return result
}

export function getMapLayer(layerId: string) {
  return mapLayers.find((layer) => layer.id === layerId) ?? null
}

export function validateMapLayers(): void {
  const ids = new Set<string>()
  const knownGroupIds = new Set<string>()
  const knownSubgroupIds = new Map<string, Set<string>>()
  for (const node of mapLayerTree) {
    knownGroupIds.add(node.id)
    const subs = new Set<string>()
    for (const child of node.children) subs.add(child.id)
    knownSubgroupIds.set(node.id, subs)
  }
  for (const layer of mapLayers) {
    if (ids.has(layer.id)) throw new Error(`Duplicate map layer id: ${layer.id}`)
    if (!knownGroupIds.has(layer.groupId)) throw new Error(`Unknown group ${layer.groupId} for map layer ${layer.id}`)
    if (layer.subgroupId !== undefined) {
      const subs = knownSubgroupIds.get(layer.groupId)
      if (subs === undefined || !subs.has(layer.subgroupId)) throw new Error(`Unknown subgroup ${layer.subgroupId} in group ${layer.groupId} for map layer ${layer.id}`)
    }
    if (!Number.isFinite(layer.order)) throw new Error(`Invalid order for map layer ${layer.id}`)
    if (layer.attribution.trim() === '') throw new Error(`Missing attribution for map layer ${layer.id}`)
    ids.add(layer.id)
  }
}

function normalizeLayerAvailability(availability: Partial<MapLayerAvailabilitySettings> | undefined): MapLayerAvailabilitySettings {
  const knownIds = new Set(mapLayers.map((layer) => layer.id))
  const availableLayerIds = Array.isArray(availability?.availableLayerIds)
    ? uniqueKnownIds(availability.availableLayerIds, knownIds)
    : DEFAULT_MAP_SETTINGS.layerAvailability.availableLayerIds

  return {
    availableLayerIds,
    showExperimentalLayers: availability?.showExperimentalLayers ?? DEFAULT_MAP_SETTINGS.layerAvailability.showExperimentalLayers,
    showFragileLayers: availability?.showFragileLayers ?? DEFAULT_MAP_SETTINGS.layerAvailability.showFragileLayers,
  }
}

function resolveFallbackBaseLayerId(availableLayers: ReturnType<typeof getAvailableMapLayers>): string {
  if (availableLayers.some((layer) => layer.id === DEFAULT_BASE_LAYER_ID)) return DEFAULT_BASE_LAYER_ID
  return availableLayers.find((layer) => layer.role === 'base')?.id ?? DEFAULT_BASE_LAYER_ID
}

function uniqueKnownIds(ids: readonly string[], knownIds: ReadonlySet<string>): string[] {
  return [...new Set(ids)].filter((id) => knownIds.has(id))
}

function clampOpacity(opacity: number): number {
  return Math.max(0, Math.min(1, opacity))
}

function normalizeMapLanguage(lang: string | undefined): string {
  if (typeof lang !== 'string') return detectBrowserLanguage()
  const trimmed = lang.trim()
  if (trimmed.length >= 2) return trimmed.slice(0, 2)
  return 'en'
}

function cloneDefaultMapSettings(): MapSettings {
  return structuredClone(DEFAULT_MAP_SETTINGS) as MapSettings
}

function detectBrowserLanguage(): string {
  try {
    const lang = navigator.language
    return lang.length >= 2 ? lang.slice(0, 2) : 'en'
  } catch {
    return 'en'
  }
}

function getMapSettingsStorage(): MapSettingsStorage | null {
  const storage = globalThis.localStorage
  return storage === undefined ? null : storage
}
