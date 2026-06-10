import { clearTrackTrimSessionCookie, getTrackTrimSessionId } from './_cookies'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import { getKomootSessionStore } from './_sessionStore'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  const sessionId = getTrackTrimSessionId(request)

  if (sessionId !== null) {
    await getKomootSessionStore().delete(sessionId)
  }

  clearTrackTrimSessionCookie(response)
  sendJson(response, 200, { ok: true })
}

