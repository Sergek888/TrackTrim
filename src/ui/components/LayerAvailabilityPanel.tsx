import { mapLayers } from '../../map/mapLayerRegistry'
import { normalizeMapSettings, type MapSettings } from '../../map/mapSettings'
import Panel from '../shared/Panel'

type Props = {
  settings: MapSettings
  onChange: (settings: MapSettings) => void
  onClose: () => void
}

export default function LayerAvailabilityPanel({ settings, onChange, onClose }: Props) {
  const availability = settings.layerAvailability
  const toggle = (ids: readonly string[], id: string, enabled: boolean) =>
    enabled ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)

  function updateAvailability(patch: Partial<typeof availability>) {
    onChange(normalizeMapSettings({ ...settings, layerAvailability: { ...availability, ...patch } }))
  }

  return (
    <Panel title="Layer Availability" onClose={onClose} closeLabel="Close layer availability">
      <div className="availability-layer-list">
        <label className="availability-toggle">
          <input
            type="checkbox"
            checked={availability.showExperimentalLayers}
            onChange={(event) => updateAvailability({ showExperimentalLayers: event.target.checked })}
          />
          <span>Показывать экспериментальные</span>
        </label>
        <label className="availability-toggle">
          <input
            type="checkbox"
            checked={availability.showFragileLayers}
            onChange={(event) => updateAvailability({ showFragileLayers: event.target.checked })}
          />
          <span>Показывать нестабильные</span>
        </label>
        {[...mapLayers]
          .sort((a, b) => a.order - b.order)
          .map((layer) => (
            <label key={`available-${layer.id}`} className="availability-layer-item">
              <input
                type="checkbox"
                checked={availability.availableLayerIds.includes(layer.id)}
                onChange={(event) => updateAvailability({ availableLayerIds: toggle(availability.availableLayerIds, layer.id, event.target.checked) })}
              />
              <span>{layer.title}</span>
            </label>
          ))}
      </div>
    </Panel>
  )
}
