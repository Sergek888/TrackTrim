import { z } from 'zod'
import { KomootApiError } from '../../src/komoot/KomootApi.js'
import { authorizeKomootRequest } from './_auth.js'
import { clearTrackTrimSessionCookie, getTrackTrimSessionId } from './_cookies.js'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http.js'
import { isAllowedKomootProxyRequest } from './_proxyAllowlist.js'
import { getKomootSessionStore } from './_sessionStore.js'

const proxySchema = z.object({
  method: z.literal('GET'),
  path: z.string().startsWith('/'),
  accept: z.string().optional(),
  query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const body = proxySchema.parse(await readJsonBody(request))
    if (!isAllowedKomootProxyRequest(body.method, body.path)) {
      sendJson(response, 400, { error: 'Only allowlisted read-only Komoot requests are allowed.' })
      return
    }

    const auth = await authorizeKomootRequest(request)
    if (!auth.ok) {
      if (auth.statusCode === 401) {
        clearTrackTrimSessionCookie(response)
      }
      sendJson(response, auth.statusCode, auth.payload)
      return
    }

    const url = new URL(body.path.replace(/^\/+/, ''), 'https://api.komoot.de/v007/')
    for (const [key, value] of Object.entries(body.query ?? {})) {
      if (value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
    const upstream = await fetch(url, {
      headers: {
        accept: body.accept ?? 'application/hal+json,application/json',
        authorization: `Basic ${Buffer.from(`${auth.session.auth.userId}:${auth.session.auth.apiToken}`, 'utf8').toString('base64')}`,
        'user-agent': 'TrackTrim/1.0',
      },
    })
    const payload = await upstream.arrayBuffer()
    response.statusCode = upstream.status
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
    response.end(Buffer.from(payload))
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: 'Komoot proxy payload is invalid.' })
      return
    }
    if (error instanceof KomootApiError && (error.status === 401 || error.status === 403)) {
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
