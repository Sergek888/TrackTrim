import Panel from '../shared/Panel'
import { getAvailableMapLayerGroups, normalizeMapSettings, type MapSettings } from '../../map/mapSettings'
import { mapLayerTree, type MapLayerData, type MapLayerTreeNode } from '../../map/mapLayers'

type Props = { settings: MapSettings; onChange: (settings: MapSettings) => void; onClose: () => void }

export default function MapLayerPanel({ settings, onChange, onClose }: Props) {
  const groups = getAvailableMapLayerGroups(settings.layerAvailability)
  const active = settings.activeLayerState
  const update = (next: MapSettings) => onChange(normalizeMapSettings(next))
  const setActive = (change: Partial<MapSettings['activeLayerState']>) => update({ ...settings, activeLayerState: { ...active, ...change } })
  const toggle = (ids: readonly string[], id: string, enabled: boolean) => enabled ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)

  return (
    <Panel id="map-settings-panel" title="Map layers" onClose={onClose} closeLabel="Close map settings">
      <div className="map-settings">
        {groups.map(({ group, layers }) => {
          const depth = getTreeDepth(mapLayerTree, group.id)
          return (
            <div className="panel-section" key={group.id} style={depth > 0 ? { marginLeft: depth * 12 } : undefined}>
              <h3>{group.title}</h3>
              {layers.map((layer) => (
                <LayerRow key={layer.id} layer={layer} active={active} setActive={setActive} toggle={toggle} />
              ))}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function LayerRow({ layer, active, setActive, toggle }: {
  layer: MapLayerData
  active: MapSettings['activeLayerState']
  setActive: (change: Partial<MapSettings['activeLayerState']>) => void
  toggle: (ids: readonly string[], id: string, enabled: boolean) => string[]
}) {
  const ids = layer.role === 'overlay' ? active.overlayLayerIds : active.terrainLayerIds
  const checked = layer.role === 'base' ? active.baseLayerId === layer.id : ids.includes(layer.id)

  return (
    <div className="map-layer-row">
      <label>
        <input
          type={layer.role === 'base' ? 'radio' : 'checkbox'}
          name={layer.role === 'base' ? 'map-base-layer' : undefined}
          checked={checked}
          onChange={(event) => {
            if (layer.role === 'base') setActive({ baseLayerId: layer.id })
            else if (layer.role === 'overlay') setActive({ overlayLayerIds: toggle(active.overlayLayerIds, layer.id, event.target.checked) })
            else setActive({ terrainLayerIds: toggle(active.terrainLayerIds, layer.id, event.target.checked) })
          }}
        />
        <span>{layer.title}</span>
      </label>
      {layer.role !== 'base' && checked && (
        <label className="map-style-range">
          <output>{Math.round((active.opacityByLayerId[layer.id] ?? layer.defaultOpacity) * 100)}%</output>
          <input
            type="range"
            min="0"
            max="100"
            value={(active.opacityByLayerId[layer.id] ?? layer.defaultOpacity) * 100}
            onChange={(event) => setActive({ opacityByLayerId: { ...active.opacityByLayerId, [layer.id]: Number(event.target.value) / 100 } })}
          />
        </label>
      )}
    </div>
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
