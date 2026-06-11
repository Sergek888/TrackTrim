import { z } from 'zod'
import {
  createSessionId,
  extractKomootSessionCookies,
  komootCookieHeader,
  setTrackTrimSessionCookie,
} from './_cookies'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from './_http'
import { displayNameFromProfile, KomootClient, KomootHttpError } from './_KomootClient'
import { getKomootSessionStore } from './_sessionStore'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  captcha: z.string().optional().default(''),
  referrer: z.string().optional(),
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const body = loginSchema.parse(await readJsonBody(request))
    const komootResponse = await fetch('https://www.komoot.com/v1/signin', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        reason: 'header',
        captcha: body.captcha,
        referrer: body.referrer ?? 'www.google.com',
        new_tab: false,
      }),
    })

    if (!komootResponse.ok) {
      const upstreamText = await komootResponse.text().catch(() => '')

      sendJson(response, komootResponse.status === 403 ? 403 : 401, {
        ok: false,
        error: loginErrorMessage(komootResponse.status, upstreamText),
        upstreamStatus: komootResponse.status,
      })
      return
    }

    const cookies = extractKomootSessionCookies(komootResponse.headers)

    if (cookies === null) {
      sendJson(response, 400, {
        ok: false,
        error: 'Komoot login succeeded but session cookies were not returned.',
      })
      return
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
      const invalidFields = error.issues.map((issue) => issue.path.join('.')).join(', ')

      sendJson(response, 400, {
        ok: false,
        error: invalidFields === ''
          ? 'Komoot login payload is invalid.'
          : `Komoot login payload is invalid: ${invalidFields}.`,
      })
      return
    }

    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 401, { ok: false, error: 'Komoot session could not be verified.' })
      return
    }

    sendJson(response, 502, {
      ok: false,
      error: error instanceof Error ? error.message : 'Komoot login could not be completed.',
    })
  }
}

function loginErrorMessage(status: number, upstreamText: string): string {
  const normalizedText = upstreamText.toLowerCase()

  if (status === 403 || normalizedText.includes('captcha')) {
    return 'Komoot requires captcha. Use a valid captcha token, an official API, or manual session connection in dev mode.'
  }

  if (status === 401 || status === 400) {
    return 'Komoot rejected the login. Check email/password; if they are correct, Komoot likely requires captcha or blocks password login for this request.'
  }

  return `Komoot login failed with upstream status ${status}.`
}
