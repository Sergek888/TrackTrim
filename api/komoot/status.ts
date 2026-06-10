import { authorizeKomootRequest } from './_auth'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import { displayNameFromProfile, KomootHttpError } from './_KomootClient'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response)
    return
  }

  try {
    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      sendJson(response, 200, auth.payload)
      return
    }

    const profile = await auth.client.getUser(auth.session.userId)
    const displayName = displayNameFromProfile(profile) ?? auth.session.displayName

    sendJson(response, 200, {
      connected: true,
      userId: auth.session.userId,
      displayName,
    })
  } catch (error) {
    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 200, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      connected: false,
      error: error instanceof Error ? error.message : 'Komoot status could not be checked.',
    })
  }
}

