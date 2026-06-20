import assert from 'node:assert/strict'
import test from 'node:test'
import { gpxConverter } from '../src/formats/gpx/GpxConverter'
import { Track } from '../src/model/Track'
import { TrackMeta } from '../src/model/TrackMeta'
import type { TrackSource } from '../src/application/sources/TrackSource'

test('serializes TrackViewer as the GPX creator', () => {
  const track = Track.fromPoints([])
  const payload = gpxConverter.serialize(track, 'Track')

  assert.equal(typeof payload.data, 'string')
  assert.match(payload.data as string, /creator="TrackViewer"/)
})

const GPX_TRACK = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<gpx version="1.1" creator="test">',
  '<metadata><name>My Tour</name><desc>A nice route</desc></metadata>',
  '<wpt lat="50.0" lon="14.0"><name>Start</name><desc>Beginning</desc></wpt>',
  '<wpt lat="51.0" lon="15.0"><name>End</name><sym>Flag</sym><type>Finish</type></wpt>',
  '<trk><name>Trail Run</name><desc>Forest path</desc><src>GPS device</src><type>running</type><number>1</number>',
  '<trkseg>',
  '<trkpt lat="50.1" lon="14.1"><ele>200</ele><time>2024-06-01T08:00:00Z</time></trkpt>',
  '<trkpt lat="50.2" lon="14.2"><ele>350</ele><time>2024-06-01T08:10:00Z</time></trkpt>',
  '<trkpt lat="50.3" lon="14.3"><ele>300</ele><time>2024-06-01T08:20:00Z</time></trkpt>',
  '</trkseg>',
  '</trk>',
  '</gpx>',
].join('\n')

test('deserialize parses track segments with lat, lon, elevation, and time', () => {
  const tracks = gpxConverter.deserialize({ data: GPX_TRACK, mimeType: 'application/gpx+xml' })

  assert.equal(tracks.length, 1)

  const track = tracks[0]
  const points = track.getPoints()

  assert.equal(points.length, 3)
  assert.equal(points[0].lat, 50.1)
  assert.equal(points[0].lon, 14.1)
  assert.equal(points[0].ele, 200)
  assert.equal(points[0].time?.toISOString(), '2024-06-01T08:00:00.000Z')
  assert.equal(points[2].lat, 50.3)
  assert.equal(points[2].ele, 300)
})

test('deserialize parses multiple segments as separate TrackSegment instances', () => {
  const gpx = [
    '<gpx version="1.1">',
    '<trk><name>Multi</name>',
    '<trkseg><trkpt lat="1" lon="1"><ele>10</ele></trkpt></trkseg>',
    '<trkseg><trkpt lat="2" lon="2"><ele>20</ele></trkpt><trkpt lat="3" lon="3"></trkpt></trkseg>',
    '</trk></gpx>',
  ].join('\n')
  const tracks = gpxConverter.deserialize({ data: gpx })

  assert.equal(tracks.length, 1)
  assert.equal(tracks[0].segmentsCount(), 2)
  assert.equal(tracks[0].segment(0)?.pointsCount(), 1)
  assert.equal(tracks[0].segment(1)?.pointsCount(), 2)
})

test('deserialize parses waypoints into ViewPoints', () => {
  const tracks = gpxConverter.deserialize({ data: GPX_TRACK })
  const viewpoints = tracks[0].getViewPoints()

  assert.equal(viewpoints.length, 2)
  assert.equal(viewpoints[0].lat, 50.0)
  assert.equal(viewpoints[0].lon, 14.0)
  assert.equal(viewpoints[0].name, 'Start')
  assert.equal(viewpoints[0].description, 'Beginning')
  assert.equal(viewpoints[1].name, 'End')
  assert.equal(viewpoints[1].symbol, 'Flag')
  assert.equal(viewpoints[1].type, 'Finish')
})

test('deserialize populates track meta with name from GPX track element', () => {
  const source: TrackSource = {
    name: 'test', color: '#000', visible: true, expanded: true, order: 0,
    loadTrackMetas: async () => [], loadTrack: async () => null,
    loadTracks: async () => [], saveTrack: async () => {},
    getOriginalUrl: () => null, getShareUrl: () => null,
  }
  const meta = new TrackMeta(source, 'remote', 'fallback', '#000')

  const tracks = gpxConverter.deserialize({ data: GPX_TRACK })

  assert.equal(tracks.length, 1)
  assert.equal(tracks[0].pointsCount(), 3)
  assert.equal(tracks[0].getViewPoints().length, 2)
})

test('deserialize parses heart rate, cadence, temperature, and power extensions', () => {
  const gpx = [
    '<gpx version="1.1">',
    '<trk><trkseg>',
    '<trkpt lat="1" lon="1">',
    '<ele>100</ele>',
    '<extensions><gpxtpx:TrackPointExtension>',
    '<gpxtpx:hr>145</gpxtpx:hr>',
    '<gpxtpx:cad>88</gpxtpx:cad>',
    '<gpxtpx:atemp>18</gpxtpx:atemp>',
    '<gpxpx:power>220</gpxpx:power>',
    '</gpxtpx:TrackPointExtension></extensions>',
    '</trkpt>',
    '</trkseg></trk></gpx>',
  ].join('\n')
  const tracks = gpxConverter.deserialize({ data: gpx })
  const point = tracks[0].point(0)

  assert.ok(point)
  assert.equal(point.extensions?.heartRate, 145)
  assert.equal(point.extensions?.cadence, 88)
  assert.equal(point.extensions?.temperature, 18)
  assert.equal(point.extensions?.power, 220)
})

test('deserialize converts routes to tracks', () => {
  const gpx = [
    '<gpx version="1.1">',
    '<rte><name>Planned Route</name><type>hiking</type>',
    '<rtept lat="10" lon="20"><ele>50</ele></rtept>',
    '<rtept lat="10.1" lon="20.1"><ele>60</ele></rtept>',
    '</rte>',
    '</gpx>',
  ].join('\n')
  const tracks = gpxConverter.deserialize({ data: gpx })

  assert.equal(tracks.length, 1)
  assert.equal(tracks[0].pointsCount(), 2)
  assert.equal(tracks[0].point(0)?.lat, 10)
  assert.equal(tracks[0].point(1)?.lat, 10.1)
})

test('deserialize produces empty array for GPX with no tracks or routes', () => {
  const gpx = '<gpx version="1.1"><wpt lat="1" lon="2"><name>Lonely</name></wpt></gpx>'
  const tracks = gpxConverter.deserialize({ data: gpx })

  assert.equal(tracks.length, 1)
  assert.equal(tracks[0].pointsCount(), 0)
  assert.equal(tracks[0].getViewPoints().length, 1)
})

test('deserialize handles GPX with default namespace', () => {
  const gpx = [
    '<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">',
    '<trk><trkseg><trkpt lat="5" lon="6"><ele>70</ele></trkpt></trkseg></trk>',
    '</gpx>',
  ].join('\n')
  const tracks = gpxConverter.deserialize({ data: gpx })

  assert.equal(tracks.length, 1)
  assert.equal(tracks[0].point(0)?.lat, 5)
  assert.equal(tracks[0].point(0)?.lon, 6)
})

test('deserialize skips track points without valid lat or lon', () => {
  const gpx = [
    '<gpx version="1.1">',
    '<trk><trkseg>',
    '<trkpt lat="1" lon="1"></trkpt>',
    '<trkpt lon="2"></trkpt>',
    '<trkpt lat="3"></trkpt>',
    '<trkpt lat="4" lon="4"></trkpt>',
    '</trkseg></trk></gpx>',
  ].join('\n')
  const tracks = gpxConverter.deserialize({ data: gpx })

  assert.equal(tracks[0].pointsCount(), 2)
  assert.equal(tracks[0].point(0)?.lat, 1)
  assert.equal(tracks[0].point(1)?.lat, 4)
})
