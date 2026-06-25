import { mapLayers } from '../mapLayers'

export const baseLayers = mapLayers.filter((layer) => layer.role === 'base')
