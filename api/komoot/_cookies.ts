import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_http.js'

export const TRACKTRIM_SESSION_COOKIE = 'tracktrim_session_id'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

export function getTrackTrimSessionId(request: ApiRequest): string | null {
  const fromParsedCookies = request.cookies?.[TRACKTRIM_SESSION_COOKIE]

  if (typeof fromParsedCookies === 'string' && fromParsedCookies.trim() !== '') {
    return fromParsedCookies
  }

  const cookieHeader = request.headers?.cookie
  const rawCookieHeader = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader

  if (typeof rawCookieHeader !== 'string') {
    return null
  }

  for (const part of rawCookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=')

    if (name === TRACKTRIM_SESSION_COOKIE) {
      const value = valueParts.join('=')

      return value === '' ? null : decodeURIComponent(value)
    }
  }

  return null
}

export function createSessionId(): string {
  return randomUUID()
}

export function setTrackTrimSessionCookie(response: ApiResponse, sessionId: string): void {
  response.setHeader('Set-Cookie', [
    `${TRACKTRIM_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax${secureCookiePart()}; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ])
}

export function clearTrackTrimSessionCookie(response: ApiResponse): void {
  response.setHeader('Set-Cookie', [
    `${TRACKTRIM_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secureCookiePart()}; Max-Age=0`,
  ])
}

function secureCookiePart(): string {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : ''
}
