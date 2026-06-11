import { z } from 'zod'
import {
  createSessionId,
  setTrackTrimSessionCookie,
} from './_cookies'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import {
  displayNameFromProfile,
  KomootClient,
  KomootHttpError,
  komootBasicAuthHeader,
} from './_KomootClient'
import { getKomootSessionStore } from './_sessionStore'

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
    const client = new KomootClient({
      authorizationHeader: komootBasicAuthHeader(body.email, body.password),
    })
    const userId = await client.detectUserId()
    const profile = await client.getUser(userId)
    const displayName = displayNameFromProfile(profile)
    const now = new Date().toISOString()
    const sessionId = createSessionId()

    await getKomootSessionStore().set({
      sessionId,
      auth: {
        email: body.email,
        password: body.password,
      },
      userId,
      displayName,
      createdAt: now,
      updatedAt: now,
    })

    setTrackTrimSessionCookie(response, sessionId)
    sendJson(response, 200, {
      ok: true,
      connected: true,
      userId,
      displayName,
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

    if (error instanceof KomootHttpError) {
      sendJson(response, 401, {
        ok: false,
        error: 'Komoot authorization failed. Check email and password.',
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
