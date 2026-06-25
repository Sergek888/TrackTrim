import { mapLayers } from '../mapLayers'

export const terrainLayers = mapLayers.filter((layer) => layer.role === 'terrain')
