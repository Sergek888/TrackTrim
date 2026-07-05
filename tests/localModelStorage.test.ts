import assert from 'node:assert/strict'
import test from 'node:test'
import { LocalModelStorage } from '../src/application/storage/LocalModelStorage'
import { registerModels } from '../src/model/base/registerModels'
import { TrackPoint } from '../src/model/TrackPoint'

class LocalStorageMock implements Storage {
  public readonly length = 0
  private readonly items = new Map<string, string>()

  public clear(): void {
    this.items.clear()
  }

  public getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  public key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }

  public removeItem(key: string): void {
    this.items.delete(key)
  }

  public setItem(key: string, value: string): void {
    this.items.set(key, value)
  }
}

function installLocalStorage(): LocalStorageMock {
  const storage = new LocalStorageMock()

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })

  return storage
}

test('LocalModelStorage saves, restores, and clears model instances', () => {
  const storage = installLocalStorage()
  const modelStorage = new LocalModelStorage('test.model')

  registerModels()

  assert.equal(modelStorage.save(new TrackPoint(1, 2, 3, new Date('2026-03-01T08:00:00Z'))), true)

  assert.notEqual(storage.getItem('test.model'), null)

  const restored = modelStorage.load<TrackPoint>()

  assert.ok(restored instanceof TrackPoint)
  assert.ok(restored.time instanceof Date)
  assert.equal(restored.lat, 1)

  modelStorage.clear()

  assert.equal(storage.getItem('test.model'), null)
})

test('LocalModelStorage returns null and clears corrupt state', () => {
  const storage = installLocalStorage()
  const modelStorage = new LocalModelStorage('test.bad-model')
  const originalWarn = console.warn
  let warned = false

  console.warn = () => {
    warned = true
  }

  try {
    storage.setItem('test.bad-model', '{bad json')

    assert.equal(modelStorage.load<TrackPoint>(), null)
    assert.equal(storage.getItem('test.bad-model'), null)
    assert.equal(warned, true)
  } finally {
    console.warn = originalWarn
  }
})

test('LocalModelStorage does not throw when browser storage quota is exceeded', () => {
  const storage = installLocalStorage()
  const modelStorage = new LocalModelStorage('test.quota')
  const originalWarn = console.warn
  let warned = false

  storage.setItem('test.quota', 'old value')
  storage.setItem = () => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  }
  console.warn = () => {
    warned = true
  }

  try {
    assert.doesNotThrow(() => {
      assert.equal(modelStorage.save(new TrackPoint(1, 2)), false)
    })
    assert.equal(storage.getItem('test.quota'), null)
    assert.equal(warned, true)
  } finally {
    console.warn = originalWarn
  }
})
