import { clearTrackTrimSessionCookie, getTrackTrimSessionId } from './_cookies.js'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http.js'
import { getKomootSessionStore } from './_sessionStore.js'

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
