import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultAvailableMapLayerIds, mapLayers } from '../src/map/mapLayers'
import { DEFAULT_MAP_SETTINGS, loadMapSettings, normalizeMapSettings, saveMapSettings } from '../src/map/mapSettings'

test('map layer catalog separates base, overlay and terrain layer kinds', () => {
  const layersById = new Map(mapLayers.map((layer) => [layer.id, layer]))

  assert.equal(layersById.get('liberty-topo')?.kind, 'vector-base')
  assert.equal(layersById.get('osm-vector')?.kind, 'vector-base')
  assert.equal(layersById.get('osm-raster')?.kind, 'raster-base')
  assert.equal(layersById.get('opentopomap')?.kind, 'raster-base')
  assert.equal(layersById.get('waymarked-hiking')?.kind, 'raster-overlay')
  assert.equal(layersById.get('bikerouter-gravel')?.kind, 'vector-overlay')
})

test('map layer catalog contains the expanded country and closure layers', () => {
  const ids = new Set(mapLayers.map(({ id }) => id))
  assert.equal(ids.has('ign-fr-plan'), true)
  assert.equal(ids.has('ign-fr-topo'), true)
  assert.equal(ids.has('ign-fr-satellite'), true)
  assert.equal(ids.has('swisstopo-hiking-closures'), true)
  assert.equal(ids.has('swisstopo-cycling-closures'), true)
  assert.equal(ids.has('swisstopo-mtb-closures'), true)
})

test('default available map layers mirror the visible world layer set', () => {
  assert.deepEqual(defaultAvailableMapLayerIds, [
    'liberty-topo',
    'osm-vector',
    'osm-topo-vector',
    'osm-raster',
    'opentopomap',
    'open-hiking-map',
    'cyclosm',
    'utagawa-vtt',
    'waymarked-hiking',
    'waymarked-cycling',
    'waymarked-mtb',
  ])
})

test('default settings use the visible vector topo base map without default terrain', () => {
  assert.equal(DEFAULT_MAP_SETTINGS.activeLayerState.baseLayerId, 'liberty-topo')
  assert.deepEqual(DEFAULT_MAP_SETTINGS.activeLayerState.terrainLayerIds, [])
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
      terrainLayerIds: [],
      opacityByLayerId: {},
    },
  })

  assert.equal(settings.activeLayerState.baseLayerId, 'liberty-topo')
  assert.deepEqual(settings.activeLayerState.overlayLayerIds, [])
})

test('normalizing map settings uses the default available base layer when a saved base is unavailable', () => {
  const settings = normalizeMapSettings({
    layerAvailability: {
      ...DEFAULT_MAP_SETTINGS.layerAvailability,
      availableLayerIds: DEFAULT_MAP_SETTINGS.layerAvailability.availableLayerIds.filter((id) => id !== 'osm-raster'),
    },
    activeLayerState: {
      baseLayerId: 'osm-raster',
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
      baseLayerId: 'osm-raster',
      overlayLayerIds: ['waymarked-hiking', 'waymarked-hiking', 'unknown'],
      terrainLayerIds: [],
      opacityByLayerId: {
        'waymarked-hiking': 2,
        unknown: 0.5,
      },
    },
  })

  assert.deepEqual(settings.activeLayerState.overlayLayerIds, ['waymarked-hiking'])
  assert.equal(settings.activeLayerState.opacityByLayerId['waymarked-hillshade'], undefined)
  assert.equal(settings.activeLayerState.opacityByLayerId['waymarked-hiking'], 1)
  assert.equal(settings.activeLayerState.opacityByLayerId.unknown, undefined)
})

test('map settings storage helpers work without browser localStorage', () => {
  const settings = loadMapSettings(null)
  assert.deepEqual(settings, DEFAULT_MAP_SETTINGS)
  assert.doesNotThrow(() => saveMapSettings(settings, null))
})
