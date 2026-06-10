import { authorizeKomootRequest } from './_auth'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import { KomootHttpError } from './_KomootClient'

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

    sendJson(response, 200, await auth.client.getUser(auth.session.userId))
  } catch (error) {
    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 401, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot profile could not be loaded.',
    })
  }
}

