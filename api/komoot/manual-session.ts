import { z } from 'zod'
import {
  createSessionId,
  komootCookieHeader,
  setTrackTrimSessionCookie,
  type KomootSessionCookies,
} from './_cookies'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import { displayNameFromProfile, KomootClient, KomootHttpError } from './_KomootClient'
import { getKomootSessionStore } from './_sessionStore'

const manualSessionSchema = z.object({
  kmtSess: z.string().min(1),
  kmtSessSig: z.string().min(1),
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  if (!manualSessionAllowed()) {
    sendJson(response, 403, {
      ok: false,
      error: 'Manual Komoot session connection is available only in dev mode.',
    })
    return
  }

  try {
    const body = manualSessionSchema.parse(await readJsonBody(request))
    const cookies: KomootSessionCookies = {
      kmtSess: body.kmtSess,
      kmtSessSig: body.kmtSessSig,
    }
    const client = new KomootClient({ cookieHeader: komootCookieHeader(cookies) })
    const userId = await client.detectUserId()
    const profile = await client.getUser(userId)
    const displayName = displayNameFromProfile(profile)
    const now = new Date().toISOString()
    const sessionId = createSessionId()

    await getKomootSessionStore().set({
      sessionId,
      cookies,
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
      sendJson(response, 400, { ok: false, error: 'Komoot session cookies are invalid.' })
      return
    }

    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 401, {
        ok: false,
        error: 'Komoot session cookies were rejected or expired.',
      })
      return
    }

    sendJson(response, 502, {
      ok: false,
      error: error instanceof Error ? error.message : 'Komoot session could not be connected.',
    })
  }
}

function manualSessionAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.KOMOOT_ALLOW_MANUAL_SESSION === '1'
}

