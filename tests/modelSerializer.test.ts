import assert from 'node:assert/strict'
import test from 'node:test'
import { configureKomootApi } from '../src/application/komoot/getKomootApi'
import { KomootTrackSource } from '../src/application/sources/KomootTrackSource'
import { LocalFileTrackSource } from '../src/application/sources/LocalFileSource'
import type { KomootApi } from '../src/komoot/KomootApi'
import { BaseModel } from '../src/model/base/BaseModel'
import { ModelSerializer } from '../src/model/base/ModelSerializer'
import { registerTrackModels } from '../src/model/base/registerTrackModels'
import { Track } from '../src/model/Track'
import { TrackMeta } from '../src/model/TrackMeta'
import { TrackPoint } from '../src/model/TrackPoint'
import { TrackSegment } from '../src/model/TrackSegment'
import { ViewPoint } from '../src/model/ViewPoint'

test('ModelSerializer restores track model prototypes and persistent state', () => {
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
  registerTrackModels()

  const point = new TrackPoint(1, 2, 100, new Date('2026-03-01T08:00:00Z'))
  const viewpoint = new ViewPoint(1, 2, 100, new Date('2026-03-01T08:00:00Z'), 'Start')
  const track = new Track([new TrackSegment([point])], [viewpoint])
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

  const state = ModelSerializer.serialize(meta)
  const serializedText = JSON.stringify(state)

  assert.doesNotMatch(serializedText, /komootApi|target|summaries|sourceTexts/)

  const restoredMeta = ModelSerializer.deserialize<TrackMeta>(state)

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

test('ModelSerializer keeps runtime source fields out of ModelState', () => {
  registerTrackModels()

  const source = new LocalFileTrackSource({
    path: 'browser-directory://source-1',
    pathKind: 'directory',
    name: 'GPX import',
    color: '#123456',
  })
  const state = ModelSerializer.serialize(source)
  const serializedText = JSON.stringify(state)

  assert.doesNotMatch(serializedText, /sourceTexts|File|temporary/)
})

test('ModelSerializer calls afterDeserialize without invoking constructor', () => {
  class ProbeModel extends BaseModel {
    public static modelType = 'serializer-probe'
    public static throwInConstructor = false
    public value = ''
    public afterDeserializeCalled = false

    public constructor() {
      super()

      if (ProbeModel.throwInConstructor) {
        throw new Error('Constructor should not be called.')
      }
    }

    public override afterDeserialize(): void {
      this.afterDeserializeCalled = true
    }
  }

  ModelSerializer.register(ProbeModel)

  const source = new ProbeModel()
  source.value = 'persisted'
  const state = ModelSerializer.serialize(source)

  ProbeModel.throwInConstructor = true

  try {
    const restored = ModelSerializer.deserialize<ProbeModel>(state)

    assert.ok(restored instanceof ProbeModel)
    assert.equal(restored.value, 'persisted')
    assert.equal(restored.afterDeserializeCalled, true)
  } finally {
    ProbeModel.throwInConstructor = false
  }
})

test('ModelSerializer rejects unregistered model types', () => {
  assert.throws(
    () => ModelSerializer.deserialize({
      __kind: 'model',
      __id: 1,
      __type: 'missing-model-type',
      fields: {},
    }),
    /Model type is not registered: missing-model-type/,
  )
})
