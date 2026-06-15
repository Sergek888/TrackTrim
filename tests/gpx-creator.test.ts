import assert from 'node:assert/strict'
import test from 'node:test'
import { gpxConverter } from '../src/formats/gpx/GpxConverter'

test('serializes TrackViewer as the GPX creator', () => {
  const payload = gpxConverter.serialize([], 'Track')

  assert.equal(typeof payload.data, 'string')
  assert.match(payload.data as string, /creator="TrackViewer"/)
})
