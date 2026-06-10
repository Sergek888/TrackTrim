import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_http'

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

export function komootCookieHeader(cookies: KomootSessionCookies): string {
  return `kmt_sess=${cookies.kmtSess}; kmt_sess.sig=${cookies.kmtSessSig}`
}

export type KomootSessionCookies = {
  kmtSess: string
  kmtSessSig: string
}

export function extractKomootSessionCookies(headers: Headers): KomootSessionCookies | null {
  const setCookies = getSetCookieHeaders(headers)
  const kmtSess = findCookieValue(setCookies, 'kmt_sess')
  const kmtSessSig = findCookieValue(setCookies, 'kmt_sess.sig')

  if (kmtSess === null || kmtSessSig === null) {
    return null
  }

  return { kmtSess, kmtSessSig }
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] }
  const values = withGetSetCookie.getSetCookie?.()

  if (values !== undefined) {
    return values
  }

  const rawHeader = headers.get('set-cookie')

  return rawHeader === null ? [] : splitCombinedSetCookie(rawHeader)
}

function splitCombinedSetCookie(header: string): string[] {
  return header.split(/,(?=\s*[^;,=\s]+(?:\.[^;,=\s]+)?=)/g).map((value) => value.trim())
}

function findCookieValue(setCookies: readonly string[], name: string): string | null {
  for (const cookie of setCookies) {
    const [cookiePair] = cookie.split(';', 1)
    const separatorIndex = cookiePair.indexOf('=')

    if (separatorIndex < 0) {
      continue
    }

    if (cookiePair.slice(0, separatorIndex).trim() === name) {
      return cookiePair.slice(separatorIndex + 1)
    }
  }

  return null
}

function secureCookiePart(): string {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : ''
}
