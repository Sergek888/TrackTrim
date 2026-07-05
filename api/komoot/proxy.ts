import { z } from 'zod'
import { authorizeKomootRequest } from './_auth.js'
import { clearTrackTrimSessionCookie } from './_cookies.js'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http.js'
import { createKomootHttpClient } from './_komootRuntime.js'
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

    const upstream = await createKomootHttpClient({
      session: auth.session.auth,
    }).requestRaw('GET', body.path, {
      query: body.query,
      accept: body.accept,
    })

    if (upstream.status === 401 || upstream.status === 403) {
      await getKomootSessionStore().delete(auth.session.sessionId)
      clearTrackTrimSessionCookie(response)
    }

    const payload = await upstream.arrayBuffer()
    response.statusCode = upstream.status
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
    response.end(Buffer.from(payload))
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: 'Komoot proxy payload is invalid.' })
      return
    }
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot proxy request failed.',
    })
  }
}
