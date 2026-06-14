import { z } from 'zod'
import { authorizeKomootRequest } from './_auth.js'
import { clearTrackTrimSessionCookie, getTrackTrimSessionId } from './_cookies.js'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http.js'
import { KomootClient, KomootHttpError, komootBasicAuthHeader } from './_KomootClient.js'
import { getKomootSessionStore } from './_sessionStore.js'

const proxySchema = z.object({
  method: z.literal('GET'),
  path: z.string().startsWith('/'),
  apiBase: z.string().url().optional(),
  accept: z.string().optional(),
  query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

const allowedApiBases = new Set(['https://www.komoot.com/api/v007', 'https://api.komoot.de/v007'])
const allowedPaths = [
  /^\/users\/\d+\/?$/,
  /^\/users\/\d+\/tours\/?$/,
  /^\/tours\/\d+\/?$/,
  /^\/discover_tours\/\d+\/?$/,
  /^\/tours\/\d+\/coordinates\/?$/,
  /^\/collections?\/\d+\/?$/,
  /^\/collections?\/\d+\/tours\/?$/,
  /^\/collections\/\d+\/compilation_lines_extended\/?$/,
]

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const body = proxySchema.parse(await readJsonBody(request))
    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      if (auth.statusCode === 401) {
        clearTrackTrimSessionCookie(response)
      }

      sendJson(response, auth.statusCode, auth.payload)
      return
    }

    const apiBase = body.apiBase ?? 'https://www.komoot.com/api/v007'

    const path = body.path.split('?')[0]

    if (
      !allowedApiBases.has(apiBase) ||
      body.path.includes('://') ||
      !allowedPaths.some((pattern) => pattern.test(path))
    ) {
      sendJson(response, 400, { error: 'Only Komoot API requests are allowed.' })
      return
    }

    const client = new KomootClient({
      authorizationHeader: komootBasicAuthHeader(
        auth.session.userId,
        auth.session.apiToken,
      ),
      apiBaseUrl: apiBase,
    })
    const payload = await client.apiGet(body.path, body.query)

    sendJson(response, 200, payload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: 'Komoot proxy payload is invalid.' })
      return
    }

    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      const sessionId = getTrackTrimSessionId(request)

      if (sessionId !== null) {
        await getKomootSessionStore().delete(sessionId)
      }

      clearTrackTrimSessionCookie(response)
      sendJson(response, 401, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot proxy request failed.',
    })
  }
}
