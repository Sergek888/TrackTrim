import Panel from '../shared/Panel'
import { normalizeMapSettings, type MapSettings } from '../../map/mapSettings'
import type { MapLayerStatusState } from '../../map/mapLayerStatus'
import { getAvailableMapLayerGroups, mapLayerTree, type MapLayerTreeNode } from '../../map/mapLayerRegistry'
import BaseLayerSection from './mapLayerPanel/BaseLayerSection'
import OverlaySection from './mapLayerPanel/OverlaySection'
import TerrainSection from './mapLayerPanel/TerrainSection'

type Props = { settings: MapSettings; layerStatus?: MapLayerStatusState; onChange: (settings: MapSettings) => void; onClose: () => void; onBack?: () => void }

export default function MapLayerPanel({ settings, layerStatus, onChange, onClose, onBack }: Props) {
  const groups = getAvailableMapLayerGroups(settings.layerAvailability)
  const active = settings.activeLayerState
  const update = (next: MapSettings) => onChange(normalizeMapSettings(next))
  const setActive = (change: Partial<MapSettings['activeLayerState']>) => update({ ...settings, activeLayerState: { ...active, ...change } })

  return (
    <Panel id="map-settings-panel" title="Map layers" onClose={onClose} onBack={onBack} backLabel="Back to tracks" closeLabel="Close map settings">
      <div className="map-settings">
        {groups.map(({ group, layers }) => {
          const depth = getTreeDepth(mapLayerTree, group.id)
          const baseLayers = layers.filter((l) => l.role === 'base')
          const overlayLayers = layers.filter((l) => l.role === 'overlay')
          const terrainLayers = layers.filter((l) => l.role === 'terrain')

          return (
            <details className="panel-section map-layer-group" key={group.id} open style={depth > 0 ? { marginLeft: depth * 12 } : undefined}>
              <summary>{group.title}</summary>
              <BaseLayerSection layers={baseLayers} active={active} layerStatus={layerStatus} onChange={setActive} />
              <OverlaySection layers={overlayLayers} active={active} layerStatus={layerStatus} onChange={setActive} />
              <TerrainSection layers={terrainLayers} active={active} layerStatus={layerStatus} onChange={setActive} />
            </details>
          )
        })}
      </div>
    </Panel>
  )
}

function getTreeDepth(tree: MapLayerTreeNode[], targetId: string, depth = 0): number {
  for (const node of tree) {
    if (node.id === targetId) return depth
    if (node.children.length > 0) {
      const found = getTreeDepth(node.children, targetId, depth + 1)
      if (found !== -1) return found
    }
  }
  return -1
}
