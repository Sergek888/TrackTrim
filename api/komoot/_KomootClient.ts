export type Logger = {
  warn?(message: string, context?: unknown): void
}

export type KomootClientOptions = {
  cookieHeader?: string
  authorizationHeader?: string
  apiBaseUrl?: string
  webBaseUrl?: string
  logger?: Logger
}

export type KomootTrackListParams = {
  limit?: number
  page?: number
  sport?: string
}

export type NormalizedKomootTour = {
  id: string
  name: string | null
  date: string | null
  distanceMeters: number | null
  sport: string | null
  originalUrl: string
}

export type KomootLoginResult = {
  userId: string
  apiToken: string
  displayName: string | null
}

export class KomootClient {
  private readonly apiBaseUrl: string
  private readonly webBaseUrl: string
  private readonly logger?: Logger

  public constructor(private readonly options: KomootClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://www.komoot.com/api/v007'
    this.webBaseUrl = options.webBaseUrl ?? 'https://www.komoot.com'
    this.logger = options.logger
  }

  public async apiGet(path: string, query?: Record<string, unknown>): Promise<unknown> {
    const response = await this.request(this.apiUrl(path, query), 'application/hal+json')

    return response.json()
  }

  public async webGet(path: string, query?: Record<string, unknown>): Promise<string> {
    const response = await this.request(this.webUrl(path, query), 'text/html')

    return response.text()
  }

  public async getUser(userId: string): Promise<unknown> {
    return this.apiGet(`/users/${userId}/`)
  }

  public async detectUserId(): Promise<string> {
    const currentUser = await this.getCurrentUser()
    const detected = userIdFromUnknown(currentUser)

    if (detected !== null) {
      return detected
    }

    const html = await this.webGet('/')
    const htmlDetected = html.match(/\/user\/(\d{6,16})/i)?.[1] ?? null

    if (htmlDetected !== null) {
      return htmlDetected
    }

    throw new Error('Komoot user id could not be detected.')
  }

  public async getCurrentUser(): Promise<unknown> {
    const candidates = ['/users/me/', '/account/']

    for (const path of candidates) {
      try {
        return await this.apiGet(path)
      } catch (error) {
        if (error instanceof KomootHttpError && error.status === 404) {
          continue
        }

        if (
          error instanceof KomootHttpError &&
          (error.status === 401 || error.status === 403)
        ) {
          throw error
        }

        this.logger?.warn?.('Komoot current-user candidate failed.', { path, error })
      }
    }

    const userId = await this.detectUserIdFromHtml()

    return this.getUser(userId)
  }

  public async getCompletedTours(
    userId: string,
    params: KomootTrackListParams = {},
  ): Promise<unknown> {
    return this.getUserTours(userId, 'tour_recorded', params)
  }

  public async getPlannedTours(
    userId: string,
    params: KomootTrackListParams = {},
  ): Promise<unknown> {
    return this.getUserTours(userId, 'tour_planned', params)
  }

  public async getTour(tourId: string | number, shareToken?: string): Promise<unknown> {
    return this.apiGet(`/tours/${tourId}`, shareToken === undefined ? undefined : { share_token: shareToken })
  }

  public async getTourTimeline(tourId: string | number, shareToken?: string): Promise<unknown> {
    return this.apiGet(
      `/tours/${tourId}/timeline`,
      shareToken === undefined ? undefined : { share_token: shareToken },
    )
  }

  public async getTourImages(tourId: string | number, shareToken?: string): Promise<unknown> {
    return this.apiGet(
      `/tours/${tourId}/images`,
      shareToken === undefined ? undefined : { share_token: shareToken },
    )
  }

  public async getTourGpx(tourId: string | number, shareToken?: string): Promise<string> {
    const response = await this.request(
      this.apiUrl(
        `/tours/${tourId}/gpx`,
        shareToken === undefined ? undefined : { share_token: shareToken },
      ),
      'application/gpx+xml,text/xml,*/*',
    )

    return response.text()
  }

  public async getCollection(collectionId: string | number, shareToken?: string): Promise<unknown> {
    return this.apiGet(
      `/collections/${collectionId}`,
      shareToken === undefined ? undefined : { share_token: shareToken },
    )
  }

  public async getCollectionCompilation(
    collectionId: string | number,
    shareToken?: string,
  ): Promise<unknown> {
    return this.apiGet(
      `/collections/${collectionId}/compilation_lines_extended/`,
      shareToken === undefined ? undefined : { share_token: shareToken },
    )
  }

  private async getUserTours(
    userId: string,
    type: 'tour_recorded' | 'tour_planned',
    params: KomootTrackListParams,
  ): Promise<unknown> {
    return this.apiGet('/users/' + userId + '/tours/', {
      type,
      page: params.page ?? 0,
      limit: params.limit,
      sport: params.sport,
    })
  }

  private async detectUserIdFromHtml(): Promise<string> {
    const html = await this.webGet('/')
    const userId = html.match(/\/user\/(\d{6,16})/i)?.[1] ?? null

    if (userId === null) {
      throw new Error('Komoot user id could not be detected.')
    }

    return userId
  }

  private async request(url: URL, accept: string): Promise<Response> {
    const response = await fetch(url, {
      headers: removeUndefinedHeaders({
        accept,
        cookie: this.options.cookieHeader,
        authorization: this.options.authorizationHeader,
        'user-agent': 'TrackTrim/1.0',
      }),
    })

    if (!response.ok) {
      throw new KomootHttpError('Komoot request failed.', response.status)
    }

    return response
  }

  private apiUrl(path: string, query?: Record<string, unknown>): URL {
    return buildUrl(this.apiBaseUrl, path, query)
  }

  private webUrl(path: string, query?: Record<string, unknown>): URL {
    return buildUrl(this.webBaseUrl, path, query)
  }
}

export function komootBasicAuthHeader(email: string, password: string): string {
  return `Basic ${Buffer.from(`${email}:${password}`, 'utf8').toString('base64')}`
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

export function normalizeKomootTours(value: unknown): NormalizedKomootTour[] {
  const items = tourItems(value)

  return items.map(normalizeTour).filter((item): item is NormalizedKomootTour => item !== null)
}

export function displayNameFromProfile(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }

  return (
    stringValue(value.display_name) ??
    stringValue(value.displayname) ??
    stringValue(value.displayName) ??
    stringValue(value.username) ??
    stringValue(value.name)
  )
}

export function userIdFromUnknown(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }

  const id = value.id ?? value.user_id ?? value.userId

  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function normalizeTour(value: unknown): NormalizedKomootTour | null {
  if (!isRecord(value)) {
    return null
  }

  const id = value.id

  if (typeof id !== 'string' && typeof id !== 'number') {
    return null
  }

  return {
    id: String(id),
    name: stringValue(value.name),
    date: stringValue(value.date),
    distanceMeters: numberValue(value.distance_m ?? value.distance),
    sport: stringValue(value.sport),
    originalUrl: `https://www.komoot.com/tour/${id}`,
  }
}

function tourItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (!isRecord(value)) {
    return []
  }

  const embedded = value._embedded

  if (isRecord(embedded)) {
    if (Array.isArray(embedded.tours)) {
      return embedded.tours
    }

    if (Array.isArray(embedded.items)) {
      return embedded.items
    }
  }

  if (Array.isArray(value.items)) {
    return value.items
  }

  return []
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): URL {
  if (!path.startsWith('/') || path.includes('://')) {
    throw new Error('Komoot path is invalid.')
  }

  const url = new URL(path, baseUrl)

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

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function removeUndefinedHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}
