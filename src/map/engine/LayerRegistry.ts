import type { MapLayerDefinition } from '../model/MapLayer'
import type { MapLayerGroup } from '../model/MapLayerGroup'
import type { MapLayerAvailabilitySettings } from '../model/MapLayerAvailability'

export class LayerRegistry {
  constructor(private layers: MapLayerDefinition[], private groups: MapLayerGroup[]) { this.validate() }

  getLayer(id: string): MapLayerDefinition | null { return this.layers.find((layer) => layer.id === id) ?? null }
  getAllLayers(): MapLayerDefinition[] { return [...this.layers].sort((a, b) => a.order - b.order) }
  getAvailableLayers(availability: MapLayerAvailabilitySettings): MapLayerDefinition[] {
    const enabled = new Set(availability.enabledLayerIds)
    const hidden = new Set(availability.hiddenLayerIds)
    const groups = new Set(availability.enabledGroupIds)
    return this.getAllLayers().filter((layer) => enabled.has(layer.id) && !hidden.has(layer.id) && groups.has(layer.groupId) && layer.reliability !== 'broken' && (availability.showExperimentalLayers || layer.reliability !== 'experimental') && (availability.showFragileLayers || layer.reliability !== 'fragile'))
  }
  getLayersByGroup(availability: MapLayerAvailabilitySettings): Array<{ group: MapLayerGroup; layers: MapLayerDefinition[] }> {
    const available = this.getAvailableLayers(availability)
    return [...this.groups].sort((a, b) => a.order - b.order).map((group) => ({ group, layers: available.filter((layer) => layer.groupId === group.id) })).filter(({ layers }) => layers.length > 0)
  }
  validate(): void {
    const ids = new Set<string>()
    const groupIds = new Set(this.groups.map((group) => group.id))
    for (const layer of this.layers) {
      if (ids.has(layer.id)) throw new Error(`Duplicate map layer id: ${layer.id}`)
      if (!groupIds.has(layer.groupId)) throw new Error(`Unknown group ${layer.groupId} for map layer ${layer.id}`)
      if (!Number.isFinite(layer.order)) throw new Error(`Invalid order for map layer ${layer.id}`)
      if (layer.attribution.trim() === '') throw new Error(`Missing attribution for map layer ${layer.id}`)
      ids.add(layer.id)
    }
  }
}
