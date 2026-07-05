import assert from 'node:assert/strict'
import test from 'node:test'
import { TrackLibrary, type TrackLibraryChange } from '../src/application/TrackLibrary'
import type { TrackFormat, TrackSource } from '../src/application/sources/TrackSource'
import { Track } from '../src/model/Track'
import { TrackMeta } from '../src/model/TrackMeta'
import { TrackPoint } from '../src/model/TrackPoint'

function readySource(): { source: TrackSource; meta: TrackMeta } {
  let source: TrackSource

  source = {
    name: 'Source',
    color: '#2563eb',
    visible: true,
    expanded: true,
    order: 0,
    async loadTrackMetas() {
      return [meta]
    },
    async loadTrack() {
      return meta.track as Track
    },
    async loadTracks() {
      return meta.track === null ? [] : [meta.track]
    },
    async saveTrack(_meta: TrackMeta, _format: TrackFormat) {},
    getOriginalUrl() {
      return null
    },
    getShareUrl() {
      return null
    },
  }

  const meta = new TrackMeta(source, 'track-1', 'Track', source.color)
  meta.track = new Track([
    new TrackPoint(1, 2, null, null),
    new TrackPoint(2, 3, null, null),
  ], [])

  return { source, meta }
}

test('source rename and expansion do not invalidate the map', async () => {
  const library = new TrackLibrary()
  const { source } = readySource()
  const changes: TrackLibraryChange[] = []

  library.subscribe((change) => changes.push(change))
  await library.addSource(source)
  changes.length = 0

  library.renameSource(source, 'Renamed')
  library.setSourceExpanded(source, false)

  assert.deepEqual(changes, [
    { mapChanged: false },
    { mapChanged: false },
  ])
})

test('map presentation operations invalidate the map', async () => {
  const library = new TrackLibrary()
  const first = readySource()
  const second = readySource()
  second.source.name = 'Second source'
  second.source.order = 1
  const changes: TrackLibraryChange[] = []

  library.subscribe((change) => changes.push(change))
  await library.addSource(first.source)
  await library.addSource(second.source)
  changes.length = 0

  library.setSourceVisible(first.source, false)
  library.setSourceColor(first.source, '#dc2626')
  library.moveSourceToIndex(second.source, 0)
  library.setTrackVisible(first.meta, true)
  library.setTrackColor(first.meta, '#16a34a')
  library.activateTrack(first.meta)
  library.focusTrack(first.meta)
  library.deleteSource(first.source)

  assert.equal(changes.length, 8)
  assert.ok(changes.every((change) => change.mapChanged))
})

test('loaded track geometry invalidates the map after loading status updates', async () => {
  const library = new TrackLibrary()
  let source: TrackSource
  let resolveTrack: (track: Track) => void = () => {}

  source = {
    name: 'Deferred source',
    color: '#2563eb',
    visible: true,
    expanded: true,
    order: 0,
    async loadTrackMetas() {
      return [meta]
    },
    async loadTrack() {
      return new Promise<Track>((resolve) => {
        resolveTrack = resolve
      })
    },
    async loadTracks() {
      return []
    },
    async saveTrack(_meta: TrackMeta, _format: TrackFormat) {},
    getOriginalUrl() {
      return null
    },
    getShareUrl() {
      return null
    },
  }

  const meta = new TrackMeta(
    source,
    'deferred-track',
    'Deferred track',
    source.color,
    { loadStatus: 'queued' },
  )
  const changes: TrackLibraryChange[] = []

  library.subscribe((change) => changes.push(change))
  await library.addSource(source)
  changes.length = 0

  resolveTrack(new Track([
    new TrackPoint(1, 2, null, null),
    new TrackPoint(2, 3, null, null),
  ], []))
  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  assert.deepEqual(changes, [{ mapChanged: true }])
})

test('metadata-only persistent state keeps sources and tracks without geometry', async () => {
  const library = new TrackLibrary()
  const { source, meta } = readySource()

  await library.addSource(source)

  const state = library.persistentState({ includeTrackGeometry: false })

  assert.equal(state.sources.length, 1)
  assert.equal(state.trackMetas.length, 1)
  assert.equal(state.trackMetas[0].source, source)
  assert.equal(state.trackMetas[0].remoteId, meta.remoteId)
  assert.equal(state.trackMetas[0].name, meta.name)
  assert.equal(state.trackMetas[0].distanceMeters, meta.distanceMeters)
  assert.equal(state.trackMetas[0].track, null)
})
