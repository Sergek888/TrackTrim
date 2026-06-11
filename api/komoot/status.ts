import { authorizeKomootRequest } from './_auth'
import { sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response)
    return
  }

  const auth = await authorizeKomootRequest(request)

  if (!auth.ok) {
    sendJson(response, 200, auth.payload)
    return
  }

  sendJson(response, 200, {
    connected: true,
    userId: auth.session.userId ?? undefined,
    displayName: auth.session.displayName,
  })
}
