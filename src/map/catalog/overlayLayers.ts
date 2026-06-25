import { mapLayers } from '../mapLayers'

export const overlayLayers = mapLayers.filter((layer) => layer.role === 'overlay')
