import maplibregl from 'maplibre-gl'
import { INTERACTIVE_TRACK_LAYER_IDS } from './mapLayerIds'

const TRACK_HIT_TOLERANCE = 5

export function setInteractiveCursor(map: maplibregl.Map): void {
  map.getCanvas().style.cursor = 'pointer'
}

export function resetInteractiveCursor(map: maplibregl.Map): void {
  map.getCanvas().style.cursor = ''
}

export function queryTrackFeatures(map: maplibregl.Map, point: maplibregl.Point, featureIndexes?: ReadonlySet<number>) {
  const layers = INTERACTIVE_TRACK_LAYER_IDS.filter((layerId) => map.getLayer(layerId) !== undefined)
  if (layers.length === 0) return []

  const directFeatures = map.queryRenderedFeatures(point, {
    layers,
  })

  const directMatches = filterFeaturesByIndex(directFeatures, featureIndexes)
  if (directMatches.length > 0) {
    return directMatches
  }

  return filterFeaturesByIndex(map.queryRenderedFeatures(
    [
      [point.x - TRACK_HIT_TOLERANCE, point.y - TRACK_HIT_TOLERANCE],
      [point.x + TRACK_HIT_TOLERANCE, point.y + TRACK_HIT_TOLERANCE],
    ],
    {
      layers,
    },
  ), featureIndexes)
}

function filterFeaturesByIndex(features: maplibregl.MapGeoJSONFeature[], featureIndexes?: ReadonlySet<number>) {
  if (featureIndexes === undefined) return features
  return features.filter((feature) => {
    const index = feature.properties?.featureIndex
    return typeof index === 'number' && featureIndexes.has(index)
  })
}
