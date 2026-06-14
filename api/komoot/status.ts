import { authorizeKomootRequest } from './_auth.js'
import { clearTrackTrimSessionCookie, getTrackTrimSessionId } from './_cookies.js'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http.js'
import { KomootAuthError } from '../../src/komoot/KomootApi.js'
import { getKomootSessionStore } from './_sessionStore.js'

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

    const user = await auth.komoot.users.getCurrentUser()

    sendJson(response, 200, {
      connected: true,
      userId: auth.session.auth.userId,
      displayName: user.displayName ?? auth.session.auth.displayName,
    })
  } catch (error) {
    if (error instanceof KomootAuthError && (error.status === 401 || error.status === 403)) {
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
