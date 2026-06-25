import FormField from '../shared/FormField'
import Panel from '../shared/Panel'
import { mapLayerPresets } from '../../map/mapLayers'
import { getAvailableMapLayerGroups, normalizeMapSettings, type MapSettings } from '../../map/mapSettings'

type Props = { settings: MapSettings; onChange: (settings: MapSettings) => void; onClose: () => void }

export default function MapLayerPanel({ settings, onChange, onClose }: Props) {
  const groups = getAvailableMapLayerGroups(settings.layerAvailability)
  const active = settings.activeLayerState
  const update = (next: MapSettings) => onChange(normalizeMapSettings(next))
  const setActive = (change: Partial<MapSettings['activeLayerState']>) => update({ ...settings, activeLayerState: { ...active, ...change, activePresetId: change.activePresetId } })
  const toggle = (ids: readonly string[], id: string, enabled: boolean) => enabled ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)

  return (
    <Panel id="map-settings-panel" title="Map layers" onClose={onClose} closeLabel="Close map settings">
      <div className="map-settings">
        <FormField label="Пресет">
          <select
            className="text-input"
            value={active.activePresetId ?? ''}
            onChange={(event) => {
              const preset = mapLayerPresets.find(({ id }) => id === event.target.value)
              if (preset === undefined) return
              setActive({
                baseLayerId: preset.baseLayerId,
                overlayLayerIds: [...preset.enabledOverlayLayerIds],
                terrainLayerIds: [...preset.enabledTerrainLayerIds],
                opacityByLayerId: { ...active.opacityByLayerId, ...preset.layerOpacityOverrides },
                activePresetId: preset.id,
              })
            }}
          >
            <option value="">Пользовательский</option>
            {mapLayerPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.title}</option>
            ))}
          </select>
        </FormField>

        {groups.map(({ group, layers }) => (
          <div className="panel-section" key={group.id}>
            <h3>{group.title}</h3>
            {layers.map((layer) => {
              const ids = layer.role === 'overlay' ? active.overlayLayerIds : active.terrainLayerIds
              const checked = layer.role === 'base' ? active.baseLayerId === layer.id : ids.includes(layer.id)
              return (
                <div className="map-layer-row" key={layer.id}>
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
            })}
          </div>
        ))}
      </div>
    </Panel>
  )
}
