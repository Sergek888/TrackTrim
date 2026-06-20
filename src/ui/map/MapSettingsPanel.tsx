import Panel from '../shared/Panel'
import { MAP_BASE_STYLE_CONFIGS } from './mapStyle'
import type { MapLabelMode, MapStyleSettings } from './mapStyleSettings'

type MapSettingsPanelProps = {
  settings: MapStyleSettings
  onChange: (settings: MapStyleSettings) => void
  onClose: () => void
}

const LABEL_MODE_OPTIONS: readonly { value: MapLabelMode; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'ru', label: 'Русские' },
  { value: 'en', label: 'English' },
  { value: 'dual', label: 'Dual' },
]

export default function MapSettingsPanel({
  settings,
  onChange,
  onClose,
}: MapSettingsPanelProps) {
  const satelliteOpacityEnabled =
    settings.baseStyle === 'satellite' || settings.baseStyle === 'hybrid'

  function updateSettings(change: Partial<MapStyleSettings>): void {
    onChange({ ...settings, ...change })
  }

  return (
    <Panel
      id="map-settings-panel"
      title="Map settings"
      onClose={onClose}
      closeLabel="Close map settings"
    >
      <div className="map-settings">
        <fieldset>
          <legend>Базовая карта</legend>
          {MAP_BASE_STYLE_CONFIGS.map((option) => (
            <label key={option.id}>
              <input
                type="radio"
                name="map-base-style"
                value={option.id}
                checked={settings.baseStyle === option.id}
                onChange={() => updateSettings({ baseStyle: option.id })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Подписи</legend>
          {LABEL_MODE_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="map-label-mode"
                value={option.value}
                checked={settings.labelMode === option.value}
                onChange={() => updateSettings({ labelMode: option.value })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Рельеф</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.showContours}
              onChange={(event) => updateSettings({ showContours: event.target.checked })}
            />
            <span>Горизонтали</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.showHillshade}
              onChange={(event) => updateSettings({ showHillshade: event.target.checked })}
            />
            <span>Тени рельефа</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.showTerrain3D}
              onChange={(event) => updateSettings({ showTerrain3D: event.target.checked })}
            />
            <span>3D-рельеф</span>
          </label>
        </fieldset>

        <fieldset disabled={!satelliteOpacityEnabled}>
          <legend>Спутник</legend>
          <label className="map-style-range">
            <span>Прозрачность спутника</span>
            <output>{settings.satelliteOpacity}%</output>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.satelliteOpacity}
              onChange={(event) => updateSettings({ satelliteOpacity: Number(event.target.value) })}
            />
          </label>
        </fieldset>
      </div>
    </Panel>
  )
}
