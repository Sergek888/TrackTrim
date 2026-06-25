import assert from 'node:assert/strict'
import test from 'node:test'
import { mapLayers } from '../src/map/mapLayers'
import { DEFAULT_MAP_SETTINGS, normalizeMapSettings } from '../src/map/mapSettings'

test('map layer catalog exposes the first-stage layers in stable order', () => {
  assert.deepEqual(
    [...mapLayers].sort((a, b) => a.order - b.order).map(({ id }) => id),
    ['osm', 'opentopomap', 'cyclosm', 'esri-satellite', 'mapterhorn-hillshade', 'waymarked-hiking', 'waymarked-cycling', 'osm-gps-traces'],
  )
})

test('normalizing unavailable active layers falls back without retaining a stale preset', () => {
  const settings = normalizeMapSettings({
    layerAvailability: {
      ...DEFAULT_MAP_SETTINGS.layerAvailability,
      availableLayerIds: DEFAULT_MAP_SETTINGS.layerAvailability.availableLayerIds.filter((id) => id !== 'esri-satellite' && id !== 'waymarked-hiking'),
    },
    activeLayerState: {
      baseLayerId: 'esri-satellite',
      overlayLayerIds: ['waymarked-hiking'],
      terrainLayerIds: ['mapterhorn-hillshade'],
      opacityByLayerId: {},
      activePresetId: 'satellite-hiking',
    },
  })

  assert.equal(settings.activeLayerState.baseLayerId, 'osm')
  assert.deepEqual(settings.activeLayerState.overlayLayerIds, [])
  assert.equal(settings.activeLayerState.activePresetId, undefined)
})
