import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'
import { mapVisualProfiles } from '../catalog/mapVisualProfiles'
import type { MapLayerDefinition } from '../model/MapLayer'
import type { ActiveMapLayerState } from '../model/MapRuntimeLayer'
import { createAnchorLayers } from './LayerOrder'

export class LayerComposer {
  async buildBaseStyle(layer: MapLayerDefinition): Promise<StyleSpecification> { return this.readStyle(layer) }
  async buildOverlayStyle(layer: MapLayerDefinition): Promise<StyleSpecification> { return this.readStyle(layer) }

  applyVisualProfile(style: StyleSpecification, layer: MapLayerDefinition, opacityOverride?: number): StyleSpecification {
    const profile = layer.visualProfileId === undefined ? undefined : mapVisualProfiles[layer.visualProfileId]
    const opacity = opacityOverride ?? layer.defaultOpacity
    const layers = style.layers.map((entry) => {
      if (entry.type === 'raster') return { ...entry, paint: { ...entry.paint, 'raster-opacity': opacity, 'raster-contrast': profile?.raster?.contrast ?? 0, 'raster-saturation': profile?.raster?.saturation ?? 0, 'raster-brightness-min': profile?.raster?.brightnessMin ?? 0, 'raster-brightness-max': profile?.raster?.brightnessMax ?? 1, 'raster-resampling': profile?.raster?.resampling ?? 'linear' } } as LayerSpecification
      if (entry.type === 'hillshade') return { ...entry, paint: { ...entry.paint, 'hillshade-exaggeration': (profile?.hillshade?.exaggeration ?? 0.35) * Math.max(0, Math.min(1, opacity)), 'hillshade-shadow-color': profile?.hillshade?.shadowColor ?? 'rgba(30, 41, 59, 0.55)', 'hillshade-highlight-color': profile?.hillshade?.highlightColor ?? 'rgba(255, 255, 255, 0.45)', 'hillshade-accent-color': profile?.hillshade?.accentColor ?? 'rgba(100, 116, 139, 0.25)', 'hillshade-illumination-direction': profile?.hillshade?.illuminationDirection ?? 315, 'hillshade-illumination-anchor': profile?.hillshade?.illuminationAnchor ?? 'viewport' } } as LayerSpecification
      return entry
    })
    return { ...style, layers }
  }

  async compose(layers: MapLayerDefinition[], state: ActiveMapLayerState): Promise<StyleSpecification> {
    const sources: StyleSpecification['sources'] = {}
    const styleLayers: LayerSpecification[] = []
    for (const layer of layers.sort((a, b) => a.order - b.order)) {
      const raw = await this.readStyle(layer)
      const styled = this.applyVisualProfile(raw, layer, state.opacityByLayerId[layer.id])
      Object.assign(sources, styled.sources)
      styleLayers.push(...styled.layers)
    }
    return { version: 8, sources, layers: [...styleLayers, ...createAnchorLayers()] }
  }

  private async readStyle(layer: MapLayerDefinition): Promise<StyleSpecification> {
    if (typeof layer.style !== 'string') return structuredClone(layer.style)
    const response = await fetch(layer.style)
    if (!response.ok) throw new Error(`Map style ${layer.id} failed: ${response.status}`)
    return await response.json() as StyleSpecification
  }
}
