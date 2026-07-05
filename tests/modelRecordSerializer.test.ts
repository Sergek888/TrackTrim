import assert from 'node:assert/strict'
import test from 'node:test'
import { configureKomootApi } from '../src/application/komoot/getKomootApi'
import { KomootTrackSource } from '../src/application/sources/KomootTrackSource'
import type { KomootApi } from '../src/komoot/KomootApi'
import {
  deserializeModelRecords,
  serializeModelRecords,
} from '../src/model/base/ModelRecordSerializer'
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

test('record serializer stores model graph as separate records and restores shared references', () => {
  configureSerializationKomootApi()
  registerModels()

  const source = new KomootTrackSource({
    url: 'https://www.komoot.com/tour/42',
    name: 'Komoot',
    color: '#123456',
  })
  const point = new TrackPoint(1, 2, 100, new Date('2026-03-01T08:00:00Z'))
  const viewpoint = new ViewPoint(1, 2, 100, new Date('2026-03-01T08:00:00Z'), 'Start')
  const track = new Track([new TrackSegment([point])], [viewpoint])
  const firstMeta = new TrackMeta(source, '42', 'First', source.color)
  const secondMeta = new TrackMeta(source, '43', 'Second', source.color)
  const root = {
    sources: [source],
    trackMetas: [firstMeta, secondMeta],
  }

  firstMeta.track = track
  firstMeta.fillMissingFromPoints(track.getPoints())

  const serialized = serializeModelRecords(root)
  const recordTypes = serialized.records.map((record) => record.type)

  assert.ok(serialized.records.length > 5)
  assert.ok(recordTypes.includes('komoot-track-source'))
  assert.ok(recordTypes.includes('track-meta'))
  assert.ok(recordTypes.includes('track'))
  assert.ok(recordTypes.includes('track-segment'))
  assert.ok(recordTypes.includes('track-point'))
  assert.doesNotMatch(JSON.stringify(serialized.records), /komootApi|target|summaries/)

  const restored = deserializeModelRecords<typeof root>(serialized.root, serialized.records)
  const restoredFirstMeta = restored.trackMetas[0]
  const restoredSecondMeta = restored.trackMetas[1]

  assert.ok(restoredFirstMeta instanceof TrackMeta)
  assert.ok(restoredFirstMeta.track instanceof Track)
  assert.ok(restoredFirstMeta.track.getSegments()[0] instanceof TrackSegment)
  assert.ok(restoredFirstMeta.track.getPoints()[0] instanceof TrackPoint)
  assert.ok(restoredFirstMeta.track.getViewPoints()[0] instanceof ViewPoint)
  assert.equal(restored.sources[0], restoredFirstMeta.source)
  assert.equal(restoredFirstMeta.source, restoredSecondMeta.source)
  assert.ok(restoredFirstMeta.track.getPoints()[0].time instanceof Date)
})
