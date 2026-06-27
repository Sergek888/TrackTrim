import assert from 'node:assert/strict'
import test from 'node:test'
import { MapStyleManager } from '../src/map/mapStyleManager'
import type { ActiveMapLayerState } from '../src/map/mapSettings'

class MockMap {
  public styles: unknown[] = []
  private onceHandlers = new Map<string, (() => void)[]>()

  on(): void {}

  once(event: string, handler: () => void): void {
    this.onceHandlers.set(event, [...(this.onceHandlers.get(event) ?? []), handler])
  }

  setStyle(style: unknown): void {
    this.styles.push(style)
    const handlers = this.onceHandlers.get('style.load') ?? []
    this.onceHandlers.delete('style.load')
    handlers.forEach((handler) => handler())
  }

  isStyleLoaded(): boolean { return true }
  getSource(): undefined { return undefined }
  addSource(): void {}
  getLayer(): undefined { return undefined }
  addLayer(): void {}
  hasImage(): boolean { return false }
  addImage(): void {}
  setPaintProperty(): void {}
}

const baseState: ActiveMapLayerState = {
  baseLayerId: 'liberty-topo',
  overlayLayerIds: [],
  terrainLayerIds: [],
  opacityByLayerId: {},
}

test('map style manager reports the applied fallback base layer to runtime restore', async () => {
  const previousFetch = globalThis.fetch
  const previousWarn = console.warn
  globalThis.fetch = async () => new Response('', { status: 500 })
  console.warn = () => {}
  const restoredBaseIds: string[] = []
  const map = new MockMap()

  try {
    const manager = new MapStyleManager(map as never, (baseLayerId) => restoredBaseIds.push(baseLayerId))
    await manager.applyState(baseState, 'en')
  } finally {
    globalThis.fetch = previousFetch
    console.warn = previousWarn
  }

  assert.deepEqual(restoredBaseIds, ['osm-raster'])
  assert.equal((map.styles[0] as { sources: Record<string, unknown> }).sources['osm-raster'] !== undefined, true)
})

test('map style manager reloads remote styles when map language changes', async () => {
  const previousFetch = globalThis.fetch
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return Response.json({
      version: 8,
      sources: {},
      layers: [
        {
          id: 'label',
          type: 'symbol',
          layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']] },
        },
      ],
    })
  }

  try {
    const manager = new MapStyleManager(new MockMap() as never, () => {})
    await manager.applyState(baseState, 'en')
    await manager.applyState(baseState, 'ru')
  } finally {
    globalThis.fetch = previousFetch
  }

  assert.equal(fetchCount, 2)
})
