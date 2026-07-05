import assert from 'node:assert/strict'
import test from 'node:test'
import { configureKomootApi } from '../src/application/komoot/getKomootApi'
import { KomootTrackSource } from '../src/application/sources/KomootTrackSource'
import { LocalFileTrackSource } from '../src/application/sources/LocalFileSource'
import type { KomootApi } from '../src/komoot/KomootApi'
import { BaseModel, deserialize, registerModel, serialize } from '../src/model/base/BaseModel'
import { registerModels } from '../src/model/base/registerModels'
import { Track } from '../src/model/Track'
import { TrackMeta } from '../src/model/TrackMeta'
import { TrackPoint } from '../src/model/TrackPoint'
import { TrackSegment } from '../src/model/TrackSegment'
import { ViewPoint } from '../src/model/ViewPoint'

function configureSerializationKomootApi(): void {
  const api = {
    urls: {
      parse: () => ({ kind: 'tour', id: '42' }),
      getTargetType: () => 'tour',
      getTourUrl: () => 'https://www.komoot.com/tour/42',
      getTourShareUrl: () => null,
      getUserUrl: (userId: string) => `https://www.komoot.com/user/${userId}`,
    },
  } as unknown as KomootApi

  configureKomootApi(api)
}

test('serialize and deserialize restore model instances and persistent state', () => {
  configureSerializationKomootApi()
  registerModels()

  const point = new TrackPoint(1, 2, 100, new Date('2026-03-01T08:00:00Z'))
  const viewpoint = new ViewPoint(1, 2, 100, new Date('2026-03-01T08:00:00Z'), 'Start')
  const segment = new TrackSegment([point])
  const track = new Track([segment], [viewpoint])
  const source = new KomootTrackSource({
    url: 'https://www.komoot.com/tour/42',
    name: 'Komoot',
    color: '#123456',
  })
  const meta = new TrackMeta(source, '42', 'Track', source.color, {
    sourceUpdatedAt: new Date('2026-03-02T12:00:00Z'),
  })

  meta.track = track
  meta.fillMissingFromPoints(track.getPoints())

  const serialized = serialize(meta)
  const serializedText = JSON.stringify(serialized)

  assert.doesNotMatch(serializedText, /komootApi|target|summaries|sourceTexts/)

  const restoredMeta = deserialize<TrackMeta>(serialized)

  assert.ok(restoredMeta instanceof TrackMeta)
  assert.ok(restoredMeta.source instanceof KomootTrackSource)
  assert.ok(restoredMeta.track instanceof Track)
  assert.ok(restoredMeta.track.getSegments()[0] instanceof TrackSegment)
  assert.ok(restoredMeta.track.getPoints()[0] instanceof TrackPoint)
  assert.ok(restoredMeta.track.getViewPoints()[0] instanceof ViewPoint)
  assert.ok(restoredMeta.sourceUpdatedAt instanceof Date)
  assert.ok(restoredMeta.track.getPoints()[0].time instanceof Date)
  assert.equal(restoredMeta.startPoint, restoredMeta.track.getPoints()[0])
  assert.equal('meta' in restoredMeta.track, false)
  assert.equal(restoredMeta.track.pointsCount(), 1)
  assert.equal(restoredMeta.track.getViewPoints()[0]?.name, 'Start')
  assert.equal(restoredMeta.source.getOriginalUrl(restoredMeta), 'https://www.komoot.com/tour/42')
})

test('individual persistent models restore prototypes and dates', () => {
  registerModels()

  const point = deserialize<TrackPoint>(serialize(
    new TrackPoint(1, 2, 3, new Date('2026-03-01T08:00:00Z')),
  ))
  const viewpoint = deserialize<ViewPoint>(serialize(
    new ViewPoint(1, 2, 3, new Date('2026-03-01T08:00:00Z'), 'View'),
  ))
  const segment = deserialize<TrackSegment>(serialize(new TrackSegment([point])))
  const track = deserialize<Track>(serialize(new Track([segment], [viewpoint])))

  assert.ok(point instanceof TrackPoint)
  assert.ok(point.time instanceof Date)
  assert.ok(viewpoint instanceof ViewPoint)
  assert.ok(viewpoint.time instanceof Date)
  assert.ok(segment instanceof TrackSegment)
  assert.ok(segment.firstPoint() instanceof TrackPoint)
  assert.ok(track instanceof Track)
  assert.ok(track.firstPoint() instanceof TrackPoint)
  assert.ok(track.getViewPoints()[0] instanceof ViewPoint)
})

test('source runtime fields are not serialized', () => {
  configureSerializationKomootApi()
  registerModels()

  const komootSource = new KomootTrackSource({
    url: 'https://www.komoot.com/tour/42',
    name: 'Komoot',
    color: '#123456',
  })
  const localSource = new LocalFileTrackSource({
    path: 'browser-directory://source-1',
    pathKind: 'directory',
    name: 'GPX import',
    color: '#123456',
  })

  assert.doesNotMatch(JSON.stringify(serialize(komootSource)), /komootApi|target|summaries/)
  assert.doesNotMatch(JSON.stringify(serialize(localSource)), /sourceTexts/)
})

test('deserialize calls model constructor', () => {
  class ProbeModel extends BaseModel {
    public static modelType = 'constructor-probe'
    public static constructorCalls = 0
    public value = ''
    public afterDeserializeCalled = false

    public constructor() {
      super()
      ProbeModel.constructorCalls += 1
    }

    public override afterDeserialize(): void {
      this.afterDeserializeCalled = true
    }
  }

  ProbeModel.constructorCalls = 0
  registerModel(ProbeModel)

  const source = new ProbeModel()
  source.value = 'persisted'
  const restored = deserialize<ProbeModel>(serialize(source))

  assert.ok(restored instanceof ProbeModel)
  assert.equal(restored.value, 'persisted')
  assert.equal(restored.afterDeserializeCalled, true)
  assert.equal(ProbeModel.constructorCalls, 2)
})

test('deserialize rejects unregistered model types', () => {
  assert.throws(
    () => deserialize({
      __type: 'missing-model-type',
      fields: {},
    }),
    /Unknown model type: missing-model-type/,
  )
})
