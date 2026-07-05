import { z } from 'zod'
import {
  createSessionId,
  setTrackTrimSessionCookie,
} from './_cookies.js'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http.js'
import { KomootAuthError } from '../../src/komoot/transport/KomootErrors.js'
import { createKomootApiClient } from './_komootRuntime.js'
import { getKomootSessionStore } from './_sessionStore.js'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const body = loginSchema.parse(await readJsonBody(request))
    const auth = await createKomootApiClient().auth.loginWithPassword(body.email, body.password)
    const now = new Date().toISOString()
    const sessionId = createSessionId()

    await getKomootSessionStore().set({
      sessionId,
      email: body.email,
      auth,
      createdAt: now,
      updatedAt: now,
    })

    setTrackTrimSessionCookie(response, sessionId)
    sendJson(response, 200, {
      ok: true,
      connected: true,
      userId: auth.userId,
      displayName: auth.displayName,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const invalidFields = error.issues.map((issue) => issue.path.join('.')).join(', ')

      sendJson(response, 400, {
        ok: false,
        error: invalidFields === ''
          ? 'Komoot login payload is invalid.'
          : `Komoot login payload is invalid: ${invalidFields}.`,
      })
      return
    }

    if (
      error instanceof KomootAuthError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      sendJson(response, 401, {
        ok: false,
        error: 'Komoot did not accept the email or password.',
        upstreamStatus: error.status,
      })
      return
    }

    sendJson(response, 502, {
      ok: false,
      error: error instanceof Error ? error.message : 'Komoot login could not be completed.',
    })
  }
}
