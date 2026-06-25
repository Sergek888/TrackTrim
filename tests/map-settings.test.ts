import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultAvailableMapLayerIds, mapLayers } from '../src/map/mapLayers'
import { DEFAULT_MAP_SETTINGS, loadMapSettings, normalizeMapSettings, saveMapSettings } from '../src/map/mapSettings'

test('map layer catalog separates vector base maps from raster base maps', () => {
  const layersById = new Map(mapLayers.map((layer) => [layer.id, layer]))

  assert.equal(layersById.get('liberty-topo')?.kind, 'vector-base')
  assert.equal(layersById.get('liberty-satellite')?.kind, 'vector-base')
  assert.equal(layersById.get('osm')?.kind, 'raster-base')
  assert.equal(layersById.get('opentopomap')?.kind, 'raster-base')
  assert.equal(layersById.get('waymarked-hiking')?.kind, 'raster-overlay')
  assert.equal(layersById.get('mapterhorn-hillshade')?.kind, 'terrain')
})

test('map layer catalog avoids duplicate GPX Studio OSM aliases', () => {
  const ids = mapLayers.map(({ id }) => id)
  assert.equal(ids.includes('gpx-osm'), false)
  assert.equal(ids.includes('gpx-osm-topo'), false)
})

test('default available map layers mirror the limited visible layer set', () => {
  assert.deepEqual(defaultAvailableMapLayerIds, [
    'liberty-topo',
    'liberty-satellite',
    'osm',
    'opentopomap',
    'open-hiking-map',
    'cyclosm',
    'waymarked-hiking',
    'waymarked-cycling',
    'waymarked-mtb',
  ])
})

test('normalizing unavailable active layers falls back without retaining stale layers', () => {
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
    },
  })

  assert.equal(settings.activeLayerState.baseLayerId, 'osm')
  assert.deepEqual(settings.activeLayerState.overlayLayerIds, [])
})

test('normalizing map settings uses the first available base layer when osm is disabled', () => {
  const settings = normalizeMapSettings({
    layerAvailability: {
      ...DEFAULT_MAP_SETTINGS.layerAvailability,
      availableLayerIds: DEFAULT_MAP_SETTINGS.layerAvailability.availableLayerIds.filter((id) => id !== 'osm'),
    },
    activeLayerState: {
      baseLayerId: 'osm',
      overlayLayerIds: [],
      terrainLayerIds: [],
      opacityByLayerId: {},
    },
  })

  assert.equal(settings.activeLayerState.baseLayerId, 'liberty-topo')
})

test('normalizing map settings removes duplicate layers and clamps opacity values', () => {
  const settings = normalizeMapSettings({
    activeLayerState: {
      baseLayerId: 'osm',
      overlayLayerIds: ['waymarked-hiking', 'waymarked-hiking', 'unknown'],
      terrainLayerIds: ['mapterhorn-hillshade'],
      opacityByLayerId: {
        'waymarked-hiking': 2,
        'mapterhorn-hillshade': -1,
        unknown: 0.5,
      },
    },
  })

  assert.deepEqual(settings.activeLayerState.overlayLayerIds, ['waymarked-hiking'])
  assert.equal(settings.activeLayerState.opacityByLayerId['waymarked-hiking'], 1)
  assert.equal(settings.activeLayerState.opacityByLayerId['mapterhorn-hillshade'], undefined)
  assert.equal(settings.activeLayerState.opacityByLayerId.unknown, undefined)
})

test('map settings storage helpers work without browser localStorage', () => {
  const settings = loadMapSettings(null)
  assert.deepEqual(settings, DEFAULT_MAP_SETTINGS)
  assert.doesNotThrow(() => saveMapSettings(settings, null))
})
