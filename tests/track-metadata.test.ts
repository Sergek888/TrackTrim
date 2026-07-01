import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { configureKomootApi } from '../src/application/komoot/getKomootApi'
import { configureLocalFileSystem, type LocalFileSystem } from '../src/application/files/localFileSystem'
import { LocalFileTrackSource } from '../src/application/sources/LocalFileSource'
import { KomootTrackSource } from '../src/application/sources/KomootTrackSource'
import type { TrackFormat, TrackSource } from '../src/application/sources/TrackSource'
import { gpxConverter } from '../src/formats/gpx/GpxConverter'
import type { KomootApi, KomootImportResult, KomootTourSummary } from '../src/komoot/KomootApi'
import {
  coordinatesFromResponse,
  summaryFromTourResponse,
  summaryFromUserTourItem,
} from '../src/komoot/normalize/KomootTourNormalizer'
import { Track } from '../src/model/Track'
import {
  TrackActivityKind,
  TrackActivityType,
  TrackDifficultyLevel,
  TrackMeta,
} from '../src/model/TrackMeta'
import { computeDurationSeconds, computeElevationGainMeters, computeElevationLossMeters } from '../src/model/TrackMeta'

function sourceStub(): TrackSource {
  return {
    name: 'Test source',
    color: '#2563eb',
    visible: true,
    expanded: true,
    order: 0,
    async loadTrackMetas() { return [] },
    async loadTrack() { throw new Error('Not implemented') },
    async loadTracks() { return [] },
    async saveTrack(_track: Track, _format: TrackFormat) {},
    getOriginalUrl() { return null },
    getShareUrl() { return null },
  }
}

test('TrackMetaOptions initializes explicit prepared metadata fields', () => {
  const source = sourceStub()
  const dateTime = new Date('2026-01-01T10:00:00Z')
  const sourceUpdatedAt = new Date('2026-01-02T10:00:00Z')
  const meta = new TrackMeta(source, '1', 'Track', source.color, {
    visible: false,
    loadStatus: 'queued',
    activityKind: TrackActivityKind.Planned,
    activityType: TrackActivityType.Hiking,
    difficulty: {
      overall: TrackDifficultyLevel.Moderate,
      technical: TrackDifficultyLevel.Easy,
      physical: TrackDifficultyLevel.Difficult,
    },
    dateTime,
    sourceUpdatedAt,
    distanceMeters: 1000,
    durationSeconds: 600,
    elevationGainMeters: 120,
    elevationLossMeters: 80,
  })

  assert.equal(meta.visible, false)
  assert.equal(meta.loadStatus, 'queued')
  assert.equal(meta.activityKind, TrackActivityKind.Planned)
  assert.equal(meta.activityType, TrackActivityType.Hiking)
  assert.equal(meta.difficulty?.technical, TrackDifficultyLevel.Easy)
  assert.equal(meta.dateTime, dateTime)
  assert.equal(meta.sourceUpdatedAt, sourceUpdatedAt)
  assert.equal(meta.distanceMeters, 1000)
  assert.equal(meta.durationSeconds, 600)
  assert.equal(meta.elevationGainMeters, 120)
  assert.equal(meta.elevationLossMeters, 80)
})

test('normalizes Komoot activity, kind, difficulty, dates, and elapsed milliseconds', () => {
  const summary = summaryFromTourResponse({
    id: 42,
    sport: 'mtb_advanced',
    type: 'tour_recorded',
    date: '2026-02-01T08:00:00Z',
    changed_at: '2026-02-02T09:00:00Z',
    difficulty: {
      grade: 'difficult',
      explanation_technical: 'dh#t2',
      explanation_fitness: 'd#c3',
    },
  })
  const unknownSport = summaryFromTourResponse({ id: 43, sport: 'future_sport' })
  const listSummary = summaryFromUserTourItem({ id: 44 }, 'planned')
  const coordinate = coordinatesFromResponse([{
    lat: 1,
    lng: 2,
    alt: 3,
    t: 12500,
    time: '2026-02-01T08:00:12.500Z',
  }])[0]

  assert.equal(summary.sport, 'mtb_advanced')
  assert.equal(summary.kind, 'recorded')
  assert.deepEqual(summary.difficulty, {
    overall: 'difficult',
    technical: 'moderate',
    physical: 'difficult',
  })
  assert.equal(summary.changedAt?.toISOString(), '2026-02-02T09:00:00.000Z')
  assert.equal(unknownSport.sport, 'other')
  assert.equal(listSummary?.kind, 'planned')
  assert.equal(coordinate?.elapsedSeconds, 12.5)
  assert.equal(coordinate?.time?.toISOString(), '2026-02-01T08:00:12.500Z')
})

test('Komoot source prepares metadata without extra requests and preserves source values', async () => {
  const summary: KomootTourSummary = {
    id: '42',
    name: 'Prepared tour',
    date: new Date('2026-02-01T08:00:00Z'),
    changedAt: new Date('2026-02-02T09:00:00Z'),
    distanceMeters: 12345,
    coordinatesUrl: null,
    coordinates: [
      { lat: 0, lon: 0, elevation: 100, time: new Date('2026-02-01T08:00:00Z'), elapsedSeconds: 0 },
      { lat: 0, lon: 0.01, elevation: 140, time: new Date('2026-02-01T08:10:00Z'), elapsedSeconds: 600 },
      { lat: 0, lon: 0.02, elevation: 110, time: new Date('2026-02-01T08:20:00Z'), elapsedSeconds: 1200 },
    ],
    sport: 'mtb',
    kind: 'planned',
    difficulty: { overall: 'moderate', technical: 'easy', physical: 'difficult' },
    durationSeconds: null,
    elevationUpMeters: 99,
    elevationDownMeters: null,
  }
  let importCalls = 0
  let coordinateCalls = 0
  const importResult: KomootImportResult = {
    source: 'komoot',
    target: { kind: 'tour', id: '42' },
    tracks: [summary],
    collection: null,
    warnings: [],
  }
  const api = {
    urls: {
      parse: () => ({ kind: 'tour', id: '42' }),
      getTargetType: () => 'tour',
      getTourUrl: () => 'https://www.komoot.com/tour/42',
      getTourShareUrl: () => null,
      getUserUrl: (userId: string) => `https://www.komoot.com/user/${userId}`,
    },
    import: {
      importTarget: async () => {
        importCalls += 1
        return importResult
      },
    },
    tours: {
      getCoordinates: async () => {
        coordinateCalls += 1
        return []
      },
    },
  } as unknown as KomootApi

  configureKomootApi(api)

  const source = new KomootTrackSource({
    url: 'https://www.komoot.com/tour/42',
    name: 'Komoot',
    color: '#123456',
  })
  const meta = (await source.loadTrackMetas())[0]

  assert.equal(importCalls, 1)
  assert.equal(coordinateCalls, 0)
  assert.equal(meta?.activityType, TrackActivityType.MountainBiking)
  assert.equal(meta?.activityKind, TrackActivityKind.Planned)
  assert.equal(meta?.difficulty?.physical, TrackDifficultyLevel.Difficult)
  assert.equal(meta?.distanceMeters, 12345)
  assert.equal(meta?.durationSeconds, 1200)
  assert.equal(meta?.elevationGainMeters, 99)
  assert.equal(meta?.elevationLossMeters, 30)
})

test('Komoot source constructor and exportState use serializable state only', () => {
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

  const source = new KomootTrackSource({
    url: 'https://www.komoot.com/tour/42',
    name: 'Komoot',
    color: '#123456',
    visible: false,
    expanded: false,
    order: 7,
  })

  assert.deepEqual(source.exportState(), {
    url: 'https://www.komoot.com/tour/42',
    name: 'Komoot',
    color: '#123456',
    visible: false,
    expanded: false,
    order: 7,
  })
  assert.equal('komootApi' in source.exportState(), false)
  assert.equal('target' in source.exportState(), false)
  assert.equal('summaries' in source.exportState(), false)
  assert.equal('userListType' in source.exportState(), false)
})

test('Track calculations use standalone functions', () => {
  const points = [
    { lat: 0, lon: 0, ele: 100, time: null },
    { lat: 0, lon: 0.01, ele: 140, time: null },
    { lat: 0, lon: 0.02, ele: 110, time: null },
  ]

  const elevationGain = computeElevationGainMeters(points)
  const elevationLoss = computeElevationLossMeters(points)

  assert.equal(elevationGain, 40)
  assert.equal(elevationLoss, 30)
})

test('local GPX metadata keeps activity time separate from file update time', () => {
  const source = sourceStub()
  const sourceUpdatedAt = new Date('2026-03-02T12:00:00Z')
  const activityTime = new Date('2026-03-01T08:00:00Z')
  const meta = new TrackMeta(source, 'local', 'local.gpx', source.color, { sourceUpdatedAt })
  const track = Track.fromPoints([
    { lat: 0, lon: 0, ele: 100, time: activityTime },
    { lat: 0, lon: 0.01, ele: 80, time: new Date(activityTime.getTime() + 60_000) },
  ], meta)

  meta.fillMissingFromPoints(track.getPoints())

  assert.equal(meta.dateTime, activityTime)
  assert.equal(meta.sourceUpdatedAt, sourceUpdatedAt)
  assert.equal(meta.durationSeconds, 60)
  assert.equal(meta.elevationGainMeters, 0)
  assert.equal(meta.elevationLossMeters, 20)
  assert.ok((meta.distanceMeters ?? 0) > 0)
})

test('Local file source loads through configured file system and exports serializable state', async () => {
  const sourceUpdatedAt = new Date('2026-03-02T12:00:00Z')
  const fileSystem: LocalFileSystem = {
    async read(path, pathKind) {
      assert.equal(path, 'browser-directory://source-1')
      assert.equal(pathKind, 'directory')

      return [{
        path: 'browser-directory://source-1/0-track.gpx',
        name: 'track.gpx',
        lastModified: sourceUpdatedAt,
        async readText() {
          return [
            '<gpx version="1.1">',
            '<trk><name>Track</name><trkseg>',
            '<trkpt lat="1" lon="2"><ele>10</ele><time>2026-03-01T08:00:00Z</time></trkpt>',
            '<trkpt lat="1.1" lon="2.1"><ele>20</ele><time>2026-03-01T08:10:00Z</time></trkpt>',
            '</trkseg></trk>',
            '</gpx>',
          ].join('')
        },
      }]
    },
  }

  configureLocalFileSystem(fileSystem)

  const source = new LocalFileTrackSource({
    path: 'browser-directory://source-1',
    pathKind: 'directory',
    name: 'GPX import',
    color: '#123456',
    visible: false,
    expanded: false,
    order: 3,
  })
  const meta = (await source.loadTrackMetas())[0]

  assert.equal(meta?.remoteId, 'browser-directory://source-1/0-track.gpx')
  assert.equal(meta?.name, 'track.gpx')
  assert.equal(meta?.sourceUpdatedAt, sourceUpdatedAt)
  assert.equal(meta?.track?.pointsCount(), 2)
  assert.deepEqual(source.exportState(), {
    path: 'browser-directory://source-1',
    pathKind: 'directory',
    name: 'GPX import',
    color: '#123456',
    visible: false,
    expanded: false,
    order: 3,
  })
  assert.equal('files' in source.exportState(), false)
})

test('Komoot elapsed coordinates do not create 1970 timestamps in GPX', () => {
  const coordinates = coordinatesFromResponse([
    { lat: 1, lng: 2, alt: 3, t: 0 },
    { lat: 1.1, lng: 2.1, alt: 4, t: 60000 },
  ])
  const track = Track.fromPoints(coordinates.map((point) => ({
    lat: point.lat,
    lon: point.lon,
    ele: point.elevation,
    time: point.time,
  })))
  const payload = gpxConverter.serialize(track, 'Komoot')

  assert.equal(typeof payload.data, 'string')
  assert.doesNotMatch(payload.data as string, /1970/)
  assert.doesNotMatch(payload.data as string, /<time>/)
})

test('TrackTooltip reads prepared metadata without Track analytics', () => {
  const tooltipSource = readFileSync(
    new URL('../src/ui/components/TrackTooltip.tsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(
    tooltipSource,
    /track\.(distanceKm|durationSec|elevationGainM|elevationLossM|statistics|averageSpeed)/,
  )
  assert.match(tooltipSource, /meta\.distanceMeters/)
  assert.match(tooltipSource, /meta\.durationSeconds/)
  assert.match(tooltipSource, /meta\.elevationGainMeters/)
  assert.match(tooltipSource, /meta\.elevationLossMeters/)
})
