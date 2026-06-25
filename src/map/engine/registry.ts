import { baseLayers } from '../catalog/baseLayers'
import { mapLayerGroups } from '../catalog/layerGroups'
import { overlayLayers } from '../catalog/overlayLayers'
import { terrainLayers } from '../catalog/terrainLayers'
import { LayerRegistry } from './LayerRegistry'
export const mapLayerRegistry = new LayerRegistry([...baseLayers, ...terrainLayers, ...overlayLayers], mapLayerGroups)
