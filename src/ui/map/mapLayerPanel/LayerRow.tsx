import type { MapLayerData } from '../../../map/mapLayerRegistry'
import type { MapLayerLoadStatus } from '../../../map/mapLayerStatus'
import type { ActiveMapLayerState } from '../../../map/mapSettings'
import LayerOpacity from './LayerOpacity'

type Props = {
  layer: MapLayerData
  active: ActiveMapLayerState
  status?: MapLayerLoadStatus
  onChange: (change: Partial<ActiveMapLayerState>) => void
}

export default function LayerRow({ layer, active, status, onChange }: Props) {
  const ids = layer.role === 'overlay' ? active.overlayLayerIds : active.terrainLayerIds
  const checked = layer.role === 'base' ? active.baseLayerId === layer.id : ids.includes(layer.id)

  function toggle(enabled: boolean): string[] {
    return enabled ? [...new Set([...ids, layer.id])] : ids.filter((value) => value !== layer.id)
  }

  return (
    <div className="map-layer-row">
      <label>
        <input
          type={layer.role === 'base' ? 'radio' : 'checkbox'}
          name={layer.role === 'base' ? 'map-base-layer' : undefined}
          checked={checked}
          onChange={(event) => {
            if (layer.role === 'base') onChange({ baseLayerId: layer.id })
            else if (layer.role === 'overlay') onChange({ overlayLayerIds: toggle(event.target.checked) })
            else onChange({ terrainLayerIds: toggle(event.target.checked) })
          }}
        />
        <span>{layer.title}</span>
        {status === 'loading' && <span className="map-layer-status map-layer-status--loading" aria-label="Loading" />}
        {status === 'failed' && <span className="map-layer-status map-layer-status--failed" aria-label="Failed to load" />}
      </label>
      {layer.role !== 'base' && checked && (
        <LayerOpacity layer={layer} active={active} onChange={onChange} />
      )}
    </div>
  )
}
