import type { MapLayerDefinition } from '../model/MapLayer'
export type LayerDiagnosticCode = 'missing-api-key' | 'requires-proxy' | 'outside-bounds' | 'max-native-zoom-exceeded' | 'experimental-layer' | 'fragile-layer' | 'broken-layer'
export function layerDiagnostics(layer: MapLayerDefinition): LayerDiagnosticCode[] {
  const result: LayerDiagnosticCode[] = []
  if (layer.requiresApiKey) result.push('missing-api-key')
  if (layer.requiresProxy) result.push('requires-proxy')
  if (layer.reliability === 'experimental') result.push('experimental-layer')
  if (layer.reliability === 'fragile') result.push('fragile-layer')
  if (layer.reliability === 'broken') result.push('broken-layer')
  return result
}
