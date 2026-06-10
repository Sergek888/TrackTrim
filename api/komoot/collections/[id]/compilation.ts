import { authorizeKomootRequest } from '../../_auth'
import { firstQueryValue, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from '../../_http'
import { KomootHttpError, normalizeKomootTours } from '../../_KomootClient'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response)
    return
  }

  try {
    const collectionId = firstQueryValue(request.query?.id)

    if (collectionId === undefined || !/^\d+$/.test(collectionId)) {
      sendJson(response, 400, { error: 'Komoot collection id is invalid.' })
      return
    }

    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      sendJson(response, auth.statusCode, auth.payload)
      return
    }

    const compilation = await auth.client.getCollectionCompilation(collectionId)

    sendJson(response, 200, {
      compilation,
      tours: normalizeKomootTours(compilation),
    })
  } catch (error) {
    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 401, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot compilation could not be loaded.',
    })
  }
}

