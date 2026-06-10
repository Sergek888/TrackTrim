import { authorizeKomootRequest } from '../_auth'
import { firstQueryValue, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_http'
import { KomootHttpError, normalizeKomootTours } from '../_KomootClient'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response)
    return
  }

  try {
    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      sendJson(response, auth.statusCode, auth.payload)
      return
    }

    const payload = await auth.client.getPlannedTours(auth.session.userId, {
      limit: parsePositiveInt(firstQueryValue(request.query?.limit)),
      page: parsePositiveInt(firstQueryValue(request.query?.page)),
      sport: firstQueryValue(request.query?.sport),
    })

    sendJson(response, 200, { tours: normalizeKomootTours(payload), raw: payload })
  } catch (error) {
    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 401, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot planned tracks could not be loaded.',
    })
  }
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

