import { mapLayerGroups, mapLayerPresets, mapLayers } from './mapLayers'

export interface ActiveMapLayerState {
  baseLayerId: string
  overlayLayerIds: string[]
  terrainLayerIds: string[]
  opacityByLayerId: Record<string, number>
  activePresetId?: string
}

export interface MapLayerAvailabilitySettings {
  availableLayerIds: string[]
  showExperimentalLayers: boolean
  showFragileLayers: boolean
}

export interface MapSettings {
  activeLayerState: ActiveMapLayerState
  layerAvailability: MapLayerAvailabilitySettings
}

const STORAGE_KEY = 'trackviewer.map-settings.v1'
const DEFAULT_BASE_LAYER_ID = 'osm'

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  activeLayerState: {
    baseLayerId: DEFAULT_BASE_LAYER_ID,
    overlayLayerIds: [],
    terrainLayerIds: [],
    opacityByLayerId: {},
  },
  layerAvailability: {
    availableLayerIds: mapLayers.filter((layer) => layer.reliability !== 'broken').map((layer) => layer.id),
    showExperimentalLayers: false,
    showFragileLayers: false,
  },
}

export function loadMapSettings(): MapSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return structuredClone(DEFAULT_MAP_SETTINGS)
    return normalizeMapSettings(JSON.parse(raw) as Partial<MapSettings>)
  } catch {
    return structuredClone(DEFAULT_MAP_SETTINGS)
  }
}

export function saveMapSettings(settings: MapSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function normalizeMapSettings(settings: Partial<MapSettings>): MapSettings {
  const layerAvailability = normalizeLayerAvailability(settings.layerAvailability)
  const available = new Set(getAvailableMapLayers(layerAvailability).map((layer) => layer.id))
  const active = settings.activeLayerState

  const baseLayerId = active?.baseLayerId !== undefined && available.has(active.baseLayerId)
    ? active.baseLayerId
    : DEFAULT_BASE_LAYER_ID
  const overlayLayerIds = (active?.overlayLayerIds ?? []).filter((id) => available.has(id))
  const terrainLayerIds = (active?.terrainLayerIds ?? []).filter((id) => available.has(id))
  const opacityByLayerId = Object.fromEntries(
    Object.entries(active?.opacityByLayerId ?? {}).filter(([id]) => available.has(id)),
  )
  const preset = mapLayerPresets.find(({ id }) => id === active?.activePresetId)
  const activePresetId = preset !== undefined && preset.baseLayerId === baseLayerId && sameIds(preset.enabledOverlayLayerIds, overlayLayerIds) && sameIds(preset.enabledTerrainLayerIds, terrainLayerIds)
    ? preset.id
    : undefined

  return {
    layerAvailability,
    activeLayerState: {
      baseLayerId,
      overlayLayerIds,
      terrainLayerIds,
      opacityByLayerId,
      activePresetId,
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
      if (layer.reliability === 'fragile' && !availability.showFragileLayers) return false
      return true
    })
}

export function getAvailableMapLayerGroups(availability: MapLayerAvailabilitySettings) {
  const layers = getAvailableMapLayers(availability)
  return [...mapLayerGroups]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({ group, layers: layers.filter((layer) => layer.groupId === group.id) }))
    .filter(({ layers }) => layers.length > 0)
}

export function getMapLayer(layerId: string) {
  return mapLayers.find((layer) => layer.id === layerId) ?? null
}

export function validateMapLayers(): void {
  const ids = new Set<string>()
  const groupIds = new Set(mapLayerGroups.map((group) => group.id))
  for (const layer of mapLayers) {
    if (ids.has(layer.id)) throw new Error(`Duplicate map layer id: ${layer.id}`)
    if (!groupIds.has(layer.groupId)) throw new Error(`Unknown group ${layer.groupId} for map layer ${layer.id}`)
    if (!Number.isFinite(layer.order)) throw new Error(`Invalid order for map layer ${layer.id}`)
    if (layer.attribution.trim() === '') throw new Error(`Missing attribution for map layer ${layer.id}`)
    ids.add(layer.id)
  }
}

function normalizeLayerAvailability(availability: Partial<MapLayerAvailabilitySettings> | undefined): MapLayerAvailabilitySettings {
  const knownIds = new Set(mapLayers.map((layer) => layer.id))
  const availableLayerIds = Array.isArray(availability?.availableLayerIds)
    ? availability.availableLayerIds.filter((id) => knownIds.has(id))
    : DEFAULT_MAP_SETTINGS.layerAvailability.availableLayerIds

  return {
    availableLayerIds,
    showExperimentalLayers: availability?.showExperimentalLayers ?? DEFAULT_MAP_SETTINGS.layerAvailability.showExperimentalLayers,
    showFragileLayers: availability?.showFragileLayers ?? DEFAULT_MAP_SETTINGS.layerAvailability.showFragileLayers,
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  const rightIds = new Set(right)
  return left.every((id) => rightIds.has(id))
}
