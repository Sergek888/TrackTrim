import { useState } from 'react'
import type {
  MapBaseStyle,
  MapLabelMode,
  MapStyleSettings,
} from '../map/mapStyleSettings'

type MapStyleControlProps = {
  settings: MapStyleSettings
  onChange: (settings: MapStyleSettings) => void
}

const BASE_STYLE_OPTIONS: readonly { value: MapBaseStyle; label: string }[] = [
  { value: 'osm', label: 'OSM' },
  { value: 'topographic', label: 'Топографическая' },
  { value: 'satellite', label: 'Спутник' },
  { value: 'hybrid', label: 'Гибрид' },
]

const LABEL_MODE_OPTIONS: readonly { value: MapLabelMode; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'ru', label: 'Русские' },
  { value: 'en', label: 'English' },
  { value: 'dual', label: 'Dual' },
]

export default function MapStyleControl({
  settings,
  onChange,
}: MapStyleControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const satelliteOpacityEnabled =
    settings.baseStyle === 'satellite' || settings.baseStyle === 'hybrid'

  function updateSettings(change: Partial<MapStyleSettings>): void {
    onChange({ ...settings, ...change })
  }

  return (
    <div className="map-style-control">
      <button
        className="map-style-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="map-style-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        Стили карты
      </button>

      {isOpen ? (
        <div className="map-style-panel" id="map-style-panel">
          <fieldset>
            <legend>Базовая карта</legend>
            {BASE_STYLE_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="map-base-style"
                  value={option.value}
                  checked={settings.baseStyle === option.value}
                  onChange={() => updateSettings({ baseStyle: option.value })}
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
                onChange={(event) =>
                  updateSettings({ showContours: event.target.checked })
                }
              />
              <span>Горизонтали</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.showHillshade}
                onChange={(event) =>
                  updateSettings({ showHillshade: event.target.checked })
                }
              />
              <span>Тени рельефа</span>
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
                onChange={(event) =>
                  updateSettings({ satelliteOpacity: Number(event.target.value) })
                }
              />
            </label>
          </fieldset>
        </div>
      ) : null}
    </div>
  )
}
