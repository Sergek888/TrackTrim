import type { MapLayerData } from '../../../map/mapLayerRegistry'
import { resolveLayerDefaults } from '../../../map/mapLayerRegistry'
import type { ActiveMapLayerState } from '../../../map/mapSettings'

type Props = {
  layer: MapLayerData
  active: ActiveMapLayerState
  onChange: (change: Partial<ActiveMapLayerState>) => void
}

export default function LayerOpacity({ layer, active, onChange }: Props) {
  const defaultOpacity = resolveLayerDefaults(layer).defaultOpacity
  const currentOpacity = active.opacityByLayerId[layer.id] ?? defaultOpacity

  return (
    <label className="map-style-range">
      <output>{Math.round(currentOpacity * 100)}%</output>
      <input
        type="range"
        min="0"
        max="100"
        value={currentOpacity * 100}
        onChange={(event) => onChange({ opacityByLayerId: { ...active.opacityByLayerId, [layer.id]: Number(event.target.value) / 100 } })}
      />
    </label>
  )
}
