import type { KomootAuthApi } from './KomootAuthApi'
import type { KomootAuthSession, KomootUser } from '../shared/KomootTypes'
import { isRecord, stringValue } from '../shared/KomootUtils'
import { KomootAuthError, KomootParseError } from '../transport/KomootErrors'
import { basicAuthHeader } from '../transport/KomootHttpClient'

export class KomootPasswordAuth implements KomootAuthApi {
  private readonly fetcher: typeof fetch

  public constructor(fetcher?: typeof fetch) {
    this.fetcher = fetcher ?? ((input, init) => fetch(input, init))
  }

  public async loginWithPassword(email: string, password: string): Promise<KomootAuthSession> {
    const normalizedEmail = email.trim().toLowerCase()
    const url = new URL(
      `/v006/account/email/${encodeURIComponent(normalizedEmail)}/`,
      'https://api.komoot.de',
    )
    const response = await this.fetcher(url, {
      headers: {
        accept: 'application/json',
        authorization: basicAuthHeader(normalizedEmail, password),
      },
    })

    if (!response.ok) {
      throw new KomootAuthError('Komoot login failed.', response.status)
    }

    return parseLoginResponse(await response.json())
  }

  public async checkSession(session: KomootAuthSession): Promise<boolean> {
    try {
      await this.getCurrentUser(session)
      return true
    } catch (error) {
      if (error instanceof KomootAuthError) {
        return false
      }
      throw error
    }
  }

  public async getCurrentUser(session: KomootAuthSession): Promise<KomootUser> {
    const response = await this.fetcher(`https://api.komoot.de/v007/users/${session.userId}/`, {
      headers: {
        accept: 'application/hal+json,application/json',
        authorization: basicAuthHeader(session.userId, session.apiToken),
      },
    })

    if (!response.ok) {
      throw new KomootAuthError('Komoot session is invalid.', response.status)
    }

    const raw = await response.json()
    return { id: session.userId, displayName: displayName(raw), raw }
  }
}

export function parseLoginResponse(value: unknown): KomootAuthSession {
  if (!isRecord(value)) {
    throw new KomootParseError('Komoot login response is invalid.')
  }

  const userId = stringValue(value.username)
  const apiToken = stringValue(value.password)
  if (userId === null || !/^\d+$/.test(userId) || apiToken === null) {
    throw new KomootParseError('Komoot login response has no account credentials.')
  }

  return {
    authMode: 'basic-token',
    userId,
    apiToken,
    displayName: isRecord(value.user) ? displayName(value.user) : null,
  }
}

function displayName(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }
  return stringValue(
    value.display_name ?? value.displayname ?? value.displayName ?? value.name ?? value.username,
  )
}
