import type maplibregl from 'maplibre-gl'
import type { ActiveMapLayerState } from '../model/MapRuntimeLayer'
import { LayerComposer } from './LayerComposer'
import { LayerRegistry } from './LayerRegistry'

export class MapStyleEngine {
  constructor(private map: maplibregl.Map, private registry: LayerRegistry, private composer: LayerComposer, private restoreRuntimeLayers: () => void) {}

  async applyBaseLayer(baseLayerId: string): Promise<void> { await this.applyState({ baseLayerId, overlayLayerIds: [], terrainLayerIds: [], opacityByLayerId: {} }) }
  async applyOverlayLayers(layerIds: string[]): Promise<void> { await this.applyState(this.stateWith({ overlayLayerIds: layerIds })) }
  async applyTerrainLayers(layerIds: string[]): Promise<void> { await this.applyState(this.stateWith({ terrainLayerIds: layerIds })) }
  async applyState(state: ActiveMapLayerState): Promise<void> {
    const base = this.registry.getLayer(state.baseLayerId) ?? this.registry.getLayer('osm')
    if (base === null) throw new Error('No default base map is registered')
    const selected = [
      base,
      ...state.terrainLayerIds.map((id) => this.registry.getLayer(id)).filter((layer): layer is NonNullable<typeof layer> => layer?.kind === 'terrain'),
      ...state.overlayLayerIds.map((id) => this.registry.getLayer(id)).filter((layer): layer is NonNullable<typeof layer> => layer?.kind === 'overlay'),
    ]
    const style = await this.composer.compose(selected, state)
    await new Promise<void>((resolve) => {
      this.map.once('style.load', () => { this.restoreRuntimeLayers(); resolve() })
      this.map.setStyle(style)
    })
  }
  removeLayer(layerId: string): void { if (this.map.getLayer(layerId) !== undefined) this.map.removeLayer(layerId) }
  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.map.getLayer(layerId)
    if (layer?.type === 'raster') this.map.setPaintProperty(layerId, 'raster-opacity', opacity)
    if (layer?.type === 'hillshade') this.map.setPaintProperty(layerId, 'hillshade-exaggeration', opacity * 0.35)
  }
  private stateWith(change: Partial<ActiveMapLayerState>): ActiveMapLayerState { return { baseLayerId: 'osm', overlayLayerIds: [], terrainLayerIds: [], opacityByLayerId: {}, ...change } }
}
