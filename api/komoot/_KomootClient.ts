export type KomootClientOptions = {
  authorizationHeader: string
  apiBaseUrl?: string
}

export type KomootLoginResult = {
  userId: string
  apiToken: string
  displayName: string | null
}

export class KomootClient {
  private readonly apiBaseUrl: string

  public constructor(private readonly options: KomootClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://api.komoot.de/v007'
  }

  public async apiGet(path: string, query?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(buildUrl(this.apiBaseUrl, path, query), {
      headers: {
        accept: 'application/hal+json',
        authorization: this.options.authorizationHeader,
        'user-agent': 'TrackTrim/1.0',
      },
    })

    if (!response.ok) {
      throw new KomootHttpError('Komoot request failed.', response.status)
    }

    return response.json()
  }
}

export function komootBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
}

export async function loginKomoot(
  email: string,
  password: string,
): Promise<KomootLoginResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const url = new URL(
    `/v006/account/email/${encodeURIComponent(normalizedEmail)}/`,
    'https://api.komoot.de',
  )
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: komootBasicAuthHeader(normalizedEmail, password),
      'user-agent': 'TrackTrim/1.0',
    },
  })

  if (!response.ok) {
    throw new KomootHttpError('Komoot login failed.', response.status)
  }

  const payload = await response.json()

  if (!isRecord(payload)) {
    throw new Error('Komoot login response is invalid.')
  }

  const userId = stringValue(payload.username)
  const apiToken = stringValue(payload.password)
  const displayName = isRecord(payload.user)
    ? displayNameFromProfile(payload.user)
    : null

  if (userId === null || !/^\d+$/.test(userId) || apiToken === null) {
    throw new Error('Komoot login response does not contain account credentials.')
  }

  return { userId, apiToken, displayName }
}

export class KomootHttpError extends Error {
  public constructor(message: string, public readonly status: number) {
    super(message)
  }
}

function displayNameFromProfile(value: Record<string, unknown>): string | null {
  return (
    stringValue(value.display_name) ??
    stringValue(value.displayname) ??
    stringValue(value.displayName) ??
    stringValue(value.username) ??
    stringValue(value.name)
  )
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): URL {
  if (!path.startsWith('/') || path.includes('://')) {
    throw new Error('Komoot path is invalid.')
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const url = new URL(path.replace(/^\/+/, ''), normalizedBaseUrl)

  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}
