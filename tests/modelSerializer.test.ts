import assert from 'node:assert/strict'
import test from 'node:test'
import { configureKomootApi } from '../src/application/komoot/getKomootApi'
import { KomootTrackSource } from '../src/application/sources/KomootTrackSource'
import type { KomootApi } from '../src/komoot/KomootApi'
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
})
