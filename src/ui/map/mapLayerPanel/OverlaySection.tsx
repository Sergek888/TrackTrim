import type { MapLayerData } from '../../../map/mapLayerRegistry'
import type { MapLayerStatusState } from '../../../map/mapLayerStatus'
import type { ActiveMapLayerState } from '../../../map/mapSettings'
import LayerRow from './LayerRow'

type Props = {
  layers: MapLayerData[]
  active: ActiveMapLayerState
  layerStatus?: MapLayerStatusState
  onChange: (change: Partial<ActiveMapLayerState>) => void
}

export default function OverlaySection({ layers, active, layerStatus, onChange }: Props) {
  if (layers.length === 0) return null
  return (
    <div className="map-layer-section">
      {layers.map((layer) => (
        <LayerRow key={layer.id} layer={layer} active={active} status={layerStatus?.[layer.id]} onChange={onChange} />
      ))}
    </div>
  )
}
