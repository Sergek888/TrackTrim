import { authorizeKomootRequest } from './_auth'
import { clearTrackTrimSessionCookie, getTrackTrimSessionId } from './_cookies'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import { KomootHttpError } from './_KomootClient'
import { getKomootSessionStore } from './_sessionStore'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response)
    return
  }

  try {
    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      if (auth.statusCode === 401) {
        clearTrackTrimSessionCookie(response)
      }

      sendJson(response, 200, auth.payload)
      return
    }

    await auth.client.getPlannedTours(auth.session.userId, { page: 0, limit: 1 })

    sendJson(response, 200, {
      connected: true,
      userId: auth.session.userId,
      displayName: auth.session.displayName,
    })
  } catch (error) {
    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      const sessionId = getTrackTrimSessionId(request)

      if (sessionId !== null) {
        await getKomootSessionStore().delete(sessionId)
      }

      clearTrackTrimSessionCookie(response)
      sendJson(response, 200, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      connected: false,
      error: error instanceof Error ? error.message : 'Komoot status could not be checked.',
    })
  }
}
