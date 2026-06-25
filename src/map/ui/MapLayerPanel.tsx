import { mapLayerPresets } from '../catalog/layerPresets'
import { mapLayerRegistry } from '../engine/registry'
import type { MapSettings } from '../model/MapRuntimeLayer'
import { normalizeMapSettings } from '../store/mapSettingsStore'
import Panel from '../../ui/shared/Panel'

type Props = { settings: MapSettings; onChange: (settings: MapSettings) => void; onClose: () => void }

export default function MapLayerPanel({ settings, onChange, onClose }: Props) {
  const groups = mapLayerRegistry.getLayersByGroup(settings.layerAvailability)
  const active = settings.activeLayerState
  const update = (next: MapSettings) => onChange(normalizeMapSettings(next))
  const setActive = (change: Partial<MapSettings['activeLayerState']>) => update({ ...settings, activeLayerState: { ...active, ...change, activePresetId: change.activePresetId } })
  const toggle = (ids: string[], id: string, enabled: boolean) => enabled ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)

  return <Panel id="map-settings-panel" title="Map layers" onClose={onClose} closeLabel="Close map settings">
    <div className="map-settings">
      <label className="map-setting-stack"><span>Пресет</span><select value={active.activePresetId ?? ''} onChange={(event) => {
        const preset = mapLayerPresets.find(({ id }) => id === event.target.value)
        if (preset === undefined) return
        setActive({ baseLayerId: preset.baseLayerId, overlayLayerIds: preset.enabledOverlayLayerIds, terrainLayerIds: preset.enabledTerrainLayerIds, opacityByLayerId: { ...active.opacityByLayerId, ...preset.layerOpacityOverrides }, activePresetId: preset.id })
      }}><option value="">Пользовательский</option>{mapLayerPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.title}</option>)}</select></label>

      {groups.map(({ group, layers }) => <fieldset key={group.id}><legend>{group.title}</legend>{layers.map((layer) => {
        const ids = layer.kind === 'overlay' ? active.overlayLayerIds : active.terrainLayerIds
        const checked = layer.kind === 'base' ? active.baseLayerId === layer.id : ids.includes(layer.id)
        return <div className="map-layer-row" key={layer.id}><label><input type={layer.kind === 'base' ? 'radio' : 'checkbox'} name={layer.kind === 'base' ? 'map-base-layer' : undefined} checked={checked} onChange={(event) => {
          if (layer.kind === 'base') setActive({ baseLayerId: layer.id })
          else if (layer.kind === 'overlay') setActive({ overlayLayerIds: toggle(active.overlayLayerIds, layer.id, event.target.checked) })
          else setActive({ terrainLayerIds: toggle(active.terrainLayerIds, layer.id, event.target.checked) })
        }}/><span>{layer.title}</span></label>{layer.kind !== 'base' && checked && <label className="map-style-range"><output>{Math.round((active.opacityByLayerId[layer.id] ?? layer.defaultOpacity) * 100)}%</output><input type="range" min="0" max="100" value={(active.opacityByLayerId[layer.id] ?? layer.defaultOpacity) * 100} onChange={(event) => setActive({ opacityByLayerId: { ...active.opacityByLayerId, [layer.id]: Number(event.target.value) / 100 } })}/></label>}</div>
      })}</fieldset>)}

      <fieldset><legend>Доступные слои</legend><label><input type="checkbox" checked={settings.layerAvailability.showExperimentalLayers} onChange={(event) => update({ ...settings, layerAvailability: { ...settings.layerAvailability, showExperimentalLayers: event.target.checked } })}/><span>Показывать экспериментальные</span></label><label><input type="checkbox" checked={settings.layerAvailability.showFragileLayers} onChange={(event) => update({ ...settings, layerAvailability: { ...settings.layerAvailability, showFragileLayers: event.target.checked } })}/><span>Показывать нестабильные</span></label>{mapLayerRegistry.getAllLayers().map((layer) => <label key={`available-${layer.id}`}><input type="checkbox" checked={settings.layerAvailability.enabledLayerIds.includes(layer.id) && !settings.layerAvailability.hiddenLayerIds.includes(layer.id)} onChange={(event) => update({ ...settings, layerAvailability: { ...settings.layerAvailability, enabledLayerIds: toggle(settings.layerAvailability.enabledLayerIds, layer.id, event.target.checked), hiddenLayerIds: event.target.checked ? settings.layerAvailability.hiddenLayerIds.filter((id) => id !== layer.id) : [...new Set([...settings.layerAvailability.hiddenLayerIds, layer.id])] } })}/><span>{layer.title}</span></label>)}</fieldset>
    </div>
  </Panel>
}
