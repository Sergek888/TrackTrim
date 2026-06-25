import { mapLayerPresets, mapLayers } from '../../map/mapLayers'
import { getAvailableMapLayerGroups, normalizeMapSettings, type MapSettings } from '../../map/mapSettings'
import Panel from '../shared/Panel'

const PRESET_DESCRIPTIONS: Record<string, string> = {
  'clean-osm': 'Базовая карта без лишнего шума. Хорошо для обзора маршрутов.',
  'hiking-osm': 'OSM плюс пешеходные маршруты. Нормальный режим по умолчанию для походов.',
  'topo-hiking': 'Топографическая карта и пешеходные маршруты. Лучше для набора высоты и рельефа.',
  'satellite-hiking': 'Спутник, тропы и мягкий рельеф. Полезно там, где карта врёт или тропа спорная.',
}

type Props = { settings: MapSettings; onChange: (settings: MapSettings) => void; onClose: () => void }

export default function MapLayerPanel({ settings, onChange, onClose }: Props) {
  const groups = getAvailableMapLayerGroups(settings.layerAvailability)
  const active = settings.activeLayerState
  const activePreset = mapLayerPresets.find(({ id }) => id === active.activePresetId)
  const update = (next: MapSettings) => onChange(normalizeMapSettings(next))
  const setActive = (change: Partial<MapSettings['activeLayerState']>) => update({ ...settings, activeLayerState: { ...active, ...change, activePresetId: change.activePresetId } })
  const toggle = (ids: readonly string[], id: string, enabled: boolean) => enabled ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)

  return <Panel id="map-settings-panel" title="Map layers" onClose={onClose} closeLabel="Close map settings">
    <div className="map-settings">
      <section className="map-settings-section" aria-labelledby="map-preset-title">
        <div className="map-settings-section-header">
          <h3 id="map-preset-title">Пресет карты</h3>
          <p>Быстрый выбор рабочего режима. Не финальная философия, просто нормальные кнопки вместо свалки.</p>
        </div>
        <label className="map-setting-stack">
          <span>Активный пресет</span>
          <select value={active.activePresetId ?? ''} onChange={(event) => {
            const preset = mapLayerPresets.find(({ id }) => id === event.target.value)
            if (preset === undefined) return
            setActive({
              baseLayerId: preset.baseLayerId,
              overlayLayerIds: [...preset.enabledOverlayLayerIds],
              terrainLayerIds: [...preset.enabledTerrainLayerIds],
              opacityByLayerId: { ...active.opacityByLayerId, ...preset.layerOpacityOverrides },
              activePresetId: preset.id,
            })
          }}>
            <option value="">Пользовательский</option>
            {mapLayerPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.title}</option>)}
          </select>
        </label>
        <p className="map-settings-hint">{activePreset === undefined ? 'Настройки отличаются от готовых пресетов.' : PRESET_DESCRIPTIONS[activePreset.id]}</p>
      </section>

      <section className="map-settings-section" aria-labelledby="map-layers-title">
        <div className="map-settings-section-header">
          <h3 id="map-layers-title">Слои</h3>
          <p>База выбирается одна. Оверлеи можно накладывать сверху.</p>
        </div>
        {groups.map(({ group, layers }) => <fieldset className="map-settings-fieldset" key={group.id}>
          <legend>{group.title}</legend>
          {layers.map((layer) => {
            const ids = layer.role === 'overlay' ? active.overlayLayerIds : active.terrainLayerIds
            const checked = layer.role === 'base' ? active.baseLayerId === layer.id : ids.includes(layer.id)
            return <div className="map-layer-row" key={layer.id}>
              <label className="map-layer-choice">
                <input type={layer.role === 'base' ? 'radio' : 'checkbox'} name={layer.role === 'base' ? 'map-base-layer' : undefined} checked={checked} onChange={(event) => {
                  if (layer.role === 'base') setActive({ baseLayerId: layer.id })
                  else if (layer.role === 'overlay') setActive({ overlayLayerIds: toggle(active.overlayLayerIds, layer.id, event.target.checked) })
                  else setActive({ terrainLayerIds: toggle(active.terrainLayerIds, layer.id, event.target.checked) })
                }}/>
                <span>{layer.title}</span>
              </label>
              {layer.role !== 'base' && checked && <label className="map-style-range">
                <span>Прозрачность</span>
                <input type="range" min="0" max="100" value={(active.opacityByLayerId[layer.id] ?? layer.defaultOpacity) * 100} onChange={(event) => setActive({ opacityByLayerId: { ...active.opacityByLayerId, [layer.id]: Number(event.target.value) / 100 } })}/>
                <output>{Math.round((active.opacityByLayerId[layer.id] ?? layer.defaultOpacity) * 100)}%</output>
              </label>}
            </div>
          })}
        </fieldset>)}
      </section>

      <section className="map-settings-section map-settings-section-muted" aria-labelledby="map-availability-title">
        <div className="map-settings-section-header">
          <h3 id="map-availability-title">Доступность слоёв</h3>
          <p>Технический блок. Его можно спрятать позже в расширенные настройки.</p>
        </div>
        <label className="map-layer-choice"><input type="checkbox" checked={settings.layerAvailability.showExperimentalLayers} onChange={(event) => update({ ...settings, layerAvailability: { ...settings.layerAvailability, showExperimentalLayers: event.target.checked } })}/><span>Показывать экспериментальные</span></label>
        <label className="map-layer-choice"><input type="checkbox" checked={settings.layerAvailability.showFragileLayers} onChange={(event) => update({ ...settings, layerAvailability: { ...settings.layerAvailability, showFragileLayers: event.target.checked } })}/><span>Показывать нестабильные</span></label>
        <div className="map-availability-list">
          {[...mapLayers].sort((a, b) => a.order - b.order).map((layer) => <label className="map-layer-choice" key={`available-${layer.id}`}><input type="checkbox" checked={settings.layerAvailability.availableLayerIds.includes(layer.id)} onChange={(event) => update({ ...settings, layerAvailability: { ...settings.layerAvailability, availableLayerIds: toggle(settings.layerAvailability.availableLayerIds, layer.id, event.target.checked) } })}/><span>{layer.title}</span></label>)}
        </div>
      </section>
    </div>
  </Panel>
}
