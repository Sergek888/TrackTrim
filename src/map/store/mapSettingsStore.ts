import { defaultMapLayerAvailability } from '../catalog/defaultLayerAvailability'
import { mapLayerPresets } from '../catalog/layerPresets'
import type { MapSettings } from '../model/MapRuntimeLayer'
import { mapLayerRegistry } from '../engine/registry'

const STORAGE_KEY = 'trackviewer.map-settings.v1'
export const DEFAULT_MAP_SETTINGS: MapSettings = { activeLayerState: { baseLayerId: 'osm', overlayLayerIds: [], terrainLayerIds: [], opacityByLayerId: {} }, layerAvailability: defaultMapLayerAvailability }

export function loadMapSettings(): MapSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return structuredClone(DEFAULT_MAP_SETTINGS)
    return normalizeMapSettings(JSON.parse(raw) as Partial<MapSettings>)
  } catch { return structuredClone(DEFAULT_MAP_SETTINGS) }
}
export function saveMapSettings(settings: MapSettings): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) }
export function normalizeMapSettings(settings: Partial<MapSettings>): MapSettings {
  const availability = { ...defaultMapLayerAvailability, ...settings.layerAvailability }
  const available = new Set(mapLayerRegistry.getAvailableLayers(availability).map((layer) => layer.id))
  const active = settings.activeLayerState
  const baseLayerAvailable = active?.baseLayerId !== undefined && available.has(active.baseLayerId)
  const baseLayerId = baseLayerAvailable ? active.baseLayerId : 'osm'
  const overlayLayerIds = (active?.overlayLayerIds ?? []).filter((id) => available.has(id))
  const terrainLayerIds = (active?.terrainLayerIds ?? []).filter((id) => available.has(id))
  const preset = mapLayerPresets.find(({ id }) => id === active?.activePresetId)
  const presetMatches = preset !== undefined && preset.baseLayerId === baseLayerId && sameIds(preset.enabledOverlayLayerIds, overlayLayerIds) && sameIds(preset.enabledTerrainLayerIds, terrainLayerIds)
  return { layerAvailability: availability, activeLayerState: { baseLayerId, overlayLayerIds, terrainLayerIds, opacityByLayerId: active?.opacityByLayerId ?? {}, activePresetId: presetMatches ? preset.id : undefined } }
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id))
}
