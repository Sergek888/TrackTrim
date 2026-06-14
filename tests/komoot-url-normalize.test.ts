import assert from 'node:assert/strict'
import test from 'node:test'
import { DefaultKomootUrlApi } from '../src/komoot/url/KomootUrlApi'
import {
  coordinatesFromResponse,
  summaryFromTourResponse,
  summaryFromUserTourItem,
  uniqueTourSummaries,
} from '../src/komoot/normalize/KomootTourNormalizer'
import { compilationLinesFromResponse } from '../src/komoot/normalize/KomootCollectionNormalizer'
import { mapTourType } from '../src/komoot/tours/KomootToursApi'

test('parses supported Komoot targets and share tokens', () => {
  const urls = new DefaultKomootUrlApi()
  assert.deepEqual(urls.parse('https://www.komoot.com/en-us/tour/123?share_token=abc'), {
    kind: 'tour',
    id: '123',
    shareToken: 'abc',
  })
  assert.deepEqual(urls.parse('https://komoot.de/collection/456'), {
    kind: 'collection',
    id: '456',
    shareToken: null,
  })
  assert.deepEqual(urls.parse('123456', { userListType: 'recorded' }), {
    kind: 'user',
    id: '123456',
    listType: 'recorded',
  })
  assert.equal(urls.parse('https://example.com/tour/123'), null)
})

test('normalizes tours, coordinates, compilation lines, and unique ids', () => {
  const summary = summaryFromTourResponse({
    id: 12,
    name: 'Tour',
    distance: 1000,
    date: '2026-01-01T00:00:00Z',
  })
  assert.equal(summary.id, '12')
  assert.equal(summary.distanceMeters, 1000)
  assert.equal(summary.date?.toISOString(), '2026-01-01T00:00:00.000Z')

  assert.deepEqual(coordinatesFromResponse({ items: [{ lat: 1, lng: 2, alt: 3 }] }), [{
    lat: 1,
    lon: 2,
    elevation: 3,
    time: null,
  }])

  const userSummary = summaryFromUserTourItem({ id: 13, name: 'User tour' })
  assert.equal(userSummary?.id, '13')

  const lines = compilationLinesFromResponse({
    _embedded: { items: [{ tour_id: 14, name: 'Line', geometry: [{ lat: 1, lon: 2 }] }] },
  })
  assert.equal(lines[0]?.id, '14')
  assert.equal(lines[0]?.coordinates?.length, 1)

  assert.deepEqual(uniqueTourSummaries([summary, { ...summary, name: 'Last' }]).map((item) => item.name), ['Last'])
  assert.equal(mapTourType('planned'), 'tour_planned')
  assert.equal(mapTourType('recorded'), 'tour_recorded')
})
