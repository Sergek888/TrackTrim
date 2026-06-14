import assert from 'node:assert/strict'
import test from 'node:test'
import { DefaultKomootImportApi } from '../src/komoot/import/KomootImportApi'
import { DefaultKomootMutationsApi } from '../src/komoot/mutations/KomootMutationsApi'
import { KomootMutationError } from '../src/komoot/transport/KomootErrors'
import { KomootHttpClient } from '../src/komoot/transport/KomootHttpClient'
import { DefaultKomootUrlApi } from '../src/komoot/url/KomootUrlApi'

const summary = {
  id: '1',
  name: 'Tour',
  date: null,
  distanceMeters: null,
  coordinatesUrl: null,
  coordinates: null,
}

test('imports tour, collection, and user lists through entity APIs', async () => {
  const requestedPages: number[] = []
  const tours = {
    getSummary: async () => summary,
    getPlannedTours: async () => ({ items: [summary], page: 0, totalPages: 1, raw: {} }),
    getRecordedTours: async (_userId: string, query: { page?: number }) => {
      requestedPages.push(query.page ?? 0)
      return {
        items: [{ ...summary, id: String((query.page ?? 0) + 1) }],
        page: query.page ?? 0,
        totalPages: 2,
        raw: {},
      }
    },
  }
  const collections = {
    get: async () => ({ id: '2', name: 'Collection', description: null, sourceUrl: null, raw: {} }),
    getTourSummaries: async () => [summary],
  }
  const api = new DefaultKomootImportApi(
    tours as never,
    collections as never,
    new DefaultKomootUrlApi(),
  )

  assert.equal((await api.importTour('1')).tracks.length, 1)
  assert.equal((await api.importCollection('2')).collection?.id, '2')
  assert.equal((await api.importUserTours('3', 'recorded')).tracks.length, 2)
  assert.deepEqual(requestedPages, [0, 1])
})

test('handles upload statuses and mutation safety', async () => {
  for (const status of [201, 202]) {
    const http = new KomootHttpClient({
      session: { authMode: 'basic-token', userId: '1', apiToken: 'token', displayName: null },
      fetch: async () => new Response(JSON.stringify({ id: '9' }), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    })
    const result = await new DefaultKomootMutationsApi(http).uploadTour({
      fileName: 'tour.gpx',
      data: '<gpx/>',
      dataType: 'gpx',
      sport: 'hiking',
      name: 'Tour',
    })
    assert.equal(result.ok, true)
  }

  const api = new DefaultKomootMutationsApi(new KomootHttpClient())
  await assert.rejects(() => api.editTour('1', {}), KomootMutationError)
  await assert.rejects(
    () => api.deleteTour('1', { confirmTourId: '2' }),
    KomootMutationError,
  )
})
