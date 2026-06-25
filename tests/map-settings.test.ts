import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultMapLayerAvailability } from '../src/map/catalog/defaultLayerAvailability'
import { mapLayerRegistry } from '../src/map/engine/registry'
import { normalizeMapSettings } from '../src/map/store/mapSettingsStore'

test('map layer registry exposes the first-stage catalog in stable order', () => {
  assert.deepEqual(
    mapLayerRegistry.getAllLayers().map(({ id }) => id),
    ['osm', 'opentopomap', 'cyclosm', 'esri-satellite', 'mapterhorn-hillshade', 'waymarked-hiking', 'waymarked-cycling', 'osm-gps-traces'],
  )
})

test('normalizing unavailable active layers falls back without retaining a stale preset', () => {
  const settings = normalizeMapSettings({
    layerAvailability: {
      ...defaultMapLayerAvailability,
      hiddenLayerIds: ['esri-satellite', 'waymarked-hiking'],
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
