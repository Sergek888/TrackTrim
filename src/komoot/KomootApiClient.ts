import {
  type KomootApi,
  type KomootCoordinate,
  type KomootCredentials,
  type KomootRequestMode,
  type KomootTarget,
  type KomootTourSummary,
  type KomootUserListType,
} from './KomootApi'
import {
  komootRequestJson,
  komootRequestText,
  KomootTransportError,
} from './KomootTransport'
import { extractKomootTourIdsFromText } from './komootTourLinks'

const KOMOOT_TOUR_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:tour|discover_tours|smart_tours)\/(\d+)/i
const KOMOOT_COLLECTION_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?collection\/(\d+)/i
const KOMOOT_USER_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?user\/(\d+)(?:\/(?:tours|backfilled-tours))?/i
const KOMOOT_USER_ID_PATTERN = /^\d{6,16}$/
const KOMOOT_API_BASE = 'https://api.komoot.de/v007'
const KOMOOT_API_FALLBACK_BASE = 'https://www.komoot.com/api/v007'
const KOMOOT_WEB_BASE = 'https://www.komoot.com'

type KomootCoordinatesResponse = {
  items?: unknown
}

type KomootTourResponse = {
  id?: unknown
  name?: unknown
  date?: unknown
  distance?: unknown
  distance_m?: unknown
  _links?: {
    coordinates?: {
      href?: unknown
    }
  }
}

type KomootCompilationLineItem = {
  id?: unknown
  name?: unknown
  distance?: unknown
  geometry?: unknown
}

type KomootCompilationLinesResponse = {
  _embedded?: {
    items?: unknown
  }
}

type KomootUserToursResponse = {
  _embedded?: {
    items?: unknown
    tours?: unknown
  }
  page?: {
    totalPages?: unknown
  }
}

type KomootUserResponse = {
  display_name?: unknown
  displayname?: unknown
  displayName?: unknown
  username?: unknown
  name?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function parseDistanceMeters(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return value
}

function parseString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function parseCoordinate(value: unknown): KomootCoordinate | null {
  if (!isRecord(value)) {
    return null
  }

  const lat = value.lat
  const lon = value.lng ?? value.lon

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null
  }

  const elevation = value.alt ?? value.ele

  return {
    lat,
    lon,
    elevation: typeof elevation === 'number' ? elevation : null,
    time: parseDate(value.t),
  }
}

function uniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

function linkHref(value: unknown, rel: string): string | null {
  if (!isRecord(value) || !isRecord(value._links)) {
    return null
  }

  const link = value._links[rel]

  if (!isRecord(link)) {
    return null
  }

  return parseString(link.href)
}

export function parseKomootTarget(
  input: string,
  userListType: KomootUserListType = 'planned',
): KomootTarget | null {
  const trimmedInput = input.trim()
  const tourMatch = trimmedInput.match(KOMOOT_TOUR_URL_PATTERN)

  if (tourMatch?.[1] !== undefined) {
    return { kind: 'tour', id: tourMatch[1] }
  }

  const collectionMatch = trimmedInput.match(KOMOOT_COLLECTION_URL_PATTERN)

  if (collectionMatch?.[1] !== undefined) {
    return { kind: 'collection', id: collectionMatch[1] }
  }

  const userMatch = trimmedInput.match(KOMOOT_USER_URL_PATTERN)

  if (userMatch?.[1] !== undefined) {
    return { kind: 'user', id: userMatch[1], listType: userListType }
  }

  if (KOMOOT_USER_ID_PATTERN.test(trimmedInput)) {
    return { kind: 'user', id: trimmedInput, listType: userListType }
  }

  return null
}

export function getKomootTargetType(
  input: string,
  userListType: KomootUserListType = 'planned',
): KomootTarget['kind'] | null {
  return parseKomootTarget(input, userListType)?.kind ?? null
}

export class KomootApiClient implements KomootApi {
  public constructor(
    private readonly credentials: KomootCredentials | null = null,
    private readonly onAuthorizationExpired?: () => void,
  ) {}

  public parseTarget(
    input: string,
    listType: KomootUserListType = 'planned',
  ): KomootTarget | null {
    return parseKomootTarget(input, listType)
  }

  public getTargetType(
    input: string,
    listType: KomootUserListType = 'planned',
  ): KomootTarget['kind'] | null {
    return getKomootTargetType(input, listType)
  }

  public async loadTrackSummaries(
    target: KomootTarget,
  ): Promise<readonly KomootTourSummary[]> {
    if (target.kind === 'tour') {
      return [await this.loadTourSummary(target.id)]
    }

    if (target.kind === 'collection') {
      return this.loadCollectionTours(target.id)
    }

    return this.loadUserTours(target.id, target.listType)
  }

  public async loadTourSummary(id: string): Promise<KomootTourSummary> {
    return this.summaryFromTour(id, await this.fetchTour(id, this.requestMode()))
  }

  public async loadTourCoordinates(
    summary: KomootTourSummary,
  ): Promise<readonly KomootCoordinate[]> {
    if (summary.coordinates !== null) {
      return summary.coordinates
    }

    if (summary.coordinatesUrl !== null) {
      try {
        return await this.fetchCoordinates(summary.coordinatesUrl, this.requestMode())
      } catch {
        const tour = await this.fetchTour(summary.id, this.requestMode())

        return this.fetchCoordinates(this.coordinatesUrlFromTour(tour, summary.id), this.requestMode())
      }
    }

    const tour = await this.fetchTour(summary.id, this.requestMode())

    return this.fetchCoordinates(this.coordinatesUrlFromTour(tour, summary.id), this.requestMode())
  }

  public async loadUserDisplayName(
    id: string,
    listType: KomootUserListType,
  ): Promise<string | null> {
    const mode = this.requestMode()

    try {
      const response = await this.fetchUserProfile(id, mode)
      const userName =
        this.userNameFromProfileResponse(response) ??
        await this.fetchUserNameFromHtml(id)

      if (userName === null) {
        return null
      }

      const suffix = listType === 'planned' ? 'planned' : 'completed'

      return `${userName} ${suffix}`
    } catch (error) {
      if (
        error instanceof KomootTransportError &&
        (error.status === 401 || error.status === 403 || error.status === 404)
      ) {
        return null
      }

      throw error
    }
  }

  public getTourOriginalUrl(id: string): string {
    return `${KOMOOT_WEB_BASE}/tour/${id}`
  }

  public getTourShareUrl(id: string): string {
    return this.getTourOriginalUrl(id)
  }

  private requestMode(): KomootRequestMode {
    return this.credentials === null ? 'direct' : 'server'
  }

  private async loadCollectionTours(
    collectionId: string,
  ): Promise<readonly KomootTourSummary[]> {
    const compilationTracks = await this.fetchCollectionTracksFromCompilationLines(collectionId)

    if (compilationTracks.length > 0) {
      return compilationTracks
    }

    const tourIds = await this.fetchCollectionTourIds(collectionId)

    return tourIds.map((id) => this.summaryFromRemoteId(id))
  }

  private async loadUserTours(
    userId: string,
    listType: KomootUserListType,
  ): Promise<readonly KomootTourSummary[]> {
    const mode = this.requestMode()
    const apiSummaries = await this.fetchUserTourSummariesFromApi(userId, listType, mode)

    if (apiSummaries.length > 0) {
      return apiSummaries
    }

    if (mode === 'server') {
      return []
    }

    return this.fetchUserTourSummariesFromHtml(userId, listType)
  }

  private async fetchUserProfile(
    userId: string,
    mode: KomootRequestMode,
  ): Promise<unknown> {
    const apiBases = [KOMOOT_API_BASE, KOMOOT_API_FALLBACK_BASE]

    for (const apiBase of apiBases) {
      try {
        return await this.fetchKomootJson(`${apiBase}/users/${userId}/`, mode)
      } catch (error) {
        if (
          error instanceof KomootTransportError &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          continue
        }

        throw error
      }
    }

    return null
  }

  private userNameFromProfileResponse(response: unknown): string | null {
    if (!isRecord(response)) {
      return null
    }

    const userResponse = response as KomootUserResponse

    return (
      parseString(userResponse.display_name) ??
      parseString(userResponse.displayname) ??
      parseString(userResponse.displayName) ??
      parseString(userResponse.username) ??
      parseString(userResponse.name)
    )
  }

  private async fetchUserNameFromHtml(userId: string): Promise<string | null> {
    try {
      const html = await this.fetchPublicText(`${KOMOOT_WEB_BASE}/user/${userId}`)
      const title = html.match(/<title>\s*([^<]+?)\s*<\/title>/i)?.[1] ?? null

      if (title === null) {
        return null
      }

      const userName = title
        .replace(/\s*[|-]\s*komoot\s*$/i, '')
        .replace(/\s*-\s*profile\s*$/i, '')
        .trim()

      if (userName === '' || /^komoot$/i.test(userName) || /log\s*in/i.test(userName)) {
        return null
      }

      return userName
    } catch (error) {
      if (error instanceof KomootTransportError) {
        return null
      }

      throw error
    }
  }

  private async fetchCollectionTourIds(collectionId: string): Promise<string[]> {
    if (this.requestMode() === 'server') {
      return this.fetchCollectionTourIdsFromApi(collectionId)
    }

    const htmlTourIds = await this.fetchCollectionTourIdsFromHtml(collectionId)

    if (htmlTourIds.length > 0) {
      return htmlTourIds
    }

    return this.fetchCollectionTourIdsFromApi(collectionId)
  }

  private async fetchCollectionTracksFromCompilationLines(
    collectionId: string,
  ): Promise<KomootTourSummary[]> {
    try {
      const response = await this.fetchPublicJson(
        `${KOMOOT_API_BASE}/collections/${collectionId}/compilation_lines_extended/`,
      )
      const compilationResponse = response as KomootCompilationLinesResponse
      const items = Array.isArray(compilationResponse._embedded?.items)
        ? compilationResponse._embedded.items
        : []

      return items
        .map((item) => this.summaryFromCompilationLineItem(item))
        .filter((summary): summary is KomootTourSummary => summary !== null)
    } catch (error) {
      if (
        error instanceof KomootTransportError &&
        (error.status === 403 || error.status === 404)
      ) {
        return []
      }

      throw error
    }
  }

  private summaryFromCompilationLineItem(item: unknown): KomootTourSummary | null {
    if (!isRecord(item)) {
      return null
    }

    const lineItem: KomootCompilationLineItem = item
    const id =
      typeof lineItem.id === 'string' || typeof lineItem.id === 'number'
        ? String(lineItem.id)
        : null
    const geometry = Array.isArray(lineItem.geometry) ? lineItem.geometry : []

    if (id === null || geometry.length === 0) {
      return null
    }

    const coordinates = geometry
      .map((point) => parseCoordinate(point))
      .filter((point): point is KomootCoordinate => point !== null)

    if (coordinates.length === 0) {
      return null
    }

    return {
      id,
      name: parseString(lineItem.name) ?? `Komoot tour ${id}`,
      date: null,
      distanceMeters: parseDistanceMeters(lineItem.distance),
      coordinatesUrl: null,
      coordinates,
    }
  }

  private async fetchCollectionTourIdsFromApi(collectionId: string): Promise<string[]> {
    const candidateUrls = [
      `${KOMOOT_API_BASE}/collection/${collectionId}`,
      `${KOMOOT_API_BASE}/collection/${collectionId}/tours`,
      `${KOMOOT_API_BASE}/collections/${collectionId}`,
      `${KOMOOT_API_BASE}/collections/${collectionId}/tours`,
    ]

    for (const url of candidateUrls) {
      try {
        const response = await this.fetchPublicJson(url)
        const ids = this.extractTourIdsFromUnknown(response)

        if (ids.length > 0) {
          return ids
        }
      } catch (error) {
        if (
          !(error instanceof KomootTransportError) ||
          (error.status !== 403 && error.status !== 404)
        ) {
          throw error
        }
      }
    }

    return []
  }

  private async fetchCollectionTourIdsFromHtml(collectionId: string): Promise<string[]> {
    const ids: string[] = []
    const canonicalUrl = `${KOMOOT_WEB_BASE}/collection/${collectionId}`
    const candidateUrls = uniqueValues([
      canonicalUrl,
      ...Array.from({ length: 49 }, (_, index) => `${canonicalUrl}?page=${index + 2}`),
    ])

    for (const url of candidateUrls) {
      try {
        const html = await this.fetchPublicText(url)
        const pageIds = extractKomootTourIdsFromText(html)

        if (pageIds.length === 0 && ids.length > 0) {
          break
        }

        const previousCount = ids.length

        ids.push(...pageIds)

        if (url.includes('?page=') && ids.length === previousCount && ids.length > 0) {
          break
        }
      } catch (error) {
        if (
          !(error instanceof KomootTransportError) ||
          (error.status !== 403 && error.status !== 404)
        ) {
          throw error
        }
      }
    }

    return uniqueValues(ids)
  }

  private async fetchUserTourSummariesFromApi(
    userId: string,
    listType: KomootUserListType,
    mode: KomootRequestMode,
  ): Promise<KomootTourSummary[]> {
    const tourType = listType === 'planned' ? 'tour_planned' : 'tour_recorded'
    const summaries: KomootTourSummary[] = []
    const apiBases = [KOMOOT_API_BASE, KOMOOT_API_FALLBACK_BASE]

    for (const apiBase of apiBases) {
      let page = 0

      while (true) {
        let response: unknown

        try {
          response = await this.fetchKomootJson(
            `${apiBase}/users/${userId}/tours/`,
            mode,
            {
              type: tourType,
              page,
            },
          )
        } catch (error) {
          if (
            error instanceof KomootTransportError &&
            (error.status === 401 || error.status === 403 || error.status === 404)
          ) {
            break
          }

          throw error
        }

        const userToursResponse = response as KomootUserToursResponse
        const tours = this.userTourItems(userToursResponse)

        summaries.push(
          ...tours
            .map((tour) => this.tourSummaryFromUserTourItem(tour))
            .filter((summary): summary is KomootTourSummary => summary !== null),
        )

        const totalPages =
          typeof userToursResponse.page?.totalPages === 'number'
            ? userToursResponse.page.totalPages
            : page + 1

        page += 1

        if (page >= totalPages || tours.length === 0) {
          break
        }
      }

      if (summaries.length > 0) {
        return this.uniqueTourSummaries(summaries)
      }
    }

    return []
  }

  private async fetchUserTourSummariesFromHtml(
    userId: string,
    listType: KomootUserListType,
  ): Promise<KomootTourSummary[]> {
    const candidateUrls =
      listType === 'planned'
        ? [`${KOMOOT_WEB_BASE}/user/${userId}/tours`]
        : [
            `${KOMOOT_WEB_BASE}/user/${userId}/backfilled-tours`,
            `${KOMOOT_WEB_BASE}/user/${userId}/tours`,
          ]

    for (const url of candidateUrls) {
      try {
        const html = await this.fetchPublicText(url)
        const ids = extractKomootTourIdsFromText(html)

        if (ids.length > 0) {
          return ids.map((id) => this.summaryFromRemoteId(id))
        }
      } catch (error) {
        if (
          !(error instanceof KomootTransportError) ||
          (error.status !== 403 && error.status !== 404)
        ) {
          throw error
        }
      }
    }

    return []
  }

  private tourSummaryFromUserTourItem(item: unknown): KomootTourSummary | null {
    if (!isRecord(item)) {
      return null
    }

    const id = this.remoteIdFromUserTourItem(item)

    if (id === null) {
      return null
    }

    return {
      id,
      name: parseString(item.name),
      date: parseDate(item.date),
      distanceMeters: parseDistanceMeters(item.distance_m ?? item.distance),
      coordinatesUrl: linkHref(item, 'coordinates') ?? this.defaultCoordinatesUrl(id),
      coordinates: null,
    }
  }

  private userTourItems(response: KomootUserToursResponse): unknown[] {
    if (Array.isArray(response._embedded?.tours)) {
      return response._embedded.tours
    }

    if (Array.isArray(response._embedded?.items)) {
      return response._embedded.items
    }

    return []
  }

  private remoteIdFromUserTourItem(item: Record<string, unknown>): string | null {
    const id = item.id

    if (typeof id === 'string' || typeof id === 'number') {
      return String(id)
    }

    return this.extractTourIdsFromUnknown(item)[0] ?? null
  }

  private summaryFromRemoteId(id: string): KomootTourSummary {
    return {
      id,
      name: null,
      date: null,
      distanceMeters: null,
      coordinatesUrl: this.defaultCoordinatesUrl(id),
      coordinates: null,
    }
  }

  private summaryFromTour(id: string, tour: KomootTourResponse): KomootTourSummary {
    return {
      id,
      name: parseString(tour.name) ?? `Komoot tour ${id}`,
      date: parseDate(tour.date),
      distanceMeters: parseDistanceMeters(tour.distance_m ?? tour.distance),
      coordinatesUrl: this.coordinatesUrlFromTour(tour, id),
      coordinates: null,
    }
  }

  private defaultCoordinatesUrl(id: string): string {
    return `${KOMOOT_API_BASE}/tours/${id}/coordinates`
  }

  private uniqueTourSummaries(summaries: readonly KomootTourSummary[]): KomootTourSummary[] {
    const seen = new Set<string>()
    const uniqueSummaries: KomootTourSummary[] = []

    for (const summary of summaries) {
      if (!seen.has(summary.id)) {
        seen.add(summary.id)
        uniqueSummaries.push(summary)
      }
    }

    return uniqueSummaries
  }

  private extractTourIdsFromUnknown(value: unknown): string[] {
    if (Array.isArray(value)) {
      return uniqueValues(value.flatMap((item) => this.extractTourIdsFromUnknown(item)))
    }

    if (!isRecord(value)) {
      return []
    }

    const ids: string[] = []

    for (const [key, nestedValue] of Object.entries(value)) {
      if (
        (key === 'tour_id' || key === 'tourId') &&
        (typeof nestedValue === 'string' || typeof nestedValue === 'number')
      ) {
        ids.push(String(nestedValue))
        continue
      }

      if (key === 'href' && typeof nestedValue === 'string') {
        ids.push(...extractKomootTourIdsFromText(nestedValue))
        continue
      }

      ids.push(...this.extractTourIdsFromUnknown(nestedValue))
    }

    return uniqueValues(ids)
  }

  private async fetchTour(
    id: string,
    mode: KomootRequestMode = 'direct',
  ): Promise<KomootTourResponse> {
    let response: unknown

    try {
      response = await this.fetchKomootJson(`${KOMOOT_API_BASE}/tours/${id}`, mode)
    } catch (error) {
      if (
        !(error instanceof KomootTransportError) ||
        (error.status !== 403 && error.status !== 404)
      ) {
        throw error
      }

      response = await this.fetchKomootJson(`${KOMOOT_API_BASE}/discover_tours/${id}`, mode)
    }

    if (!isRecord(response)) {
      throw new Error('Komoot tour response is invalid.')
    }

    return response
  }

  private coordinatesUrlFromTour(tour: KomootTourResponse, id: string): string {
    const href = tour._links?.coordinates?.href

    if (typeof href === 'string' && href.trim() !== '') {
      return new URL(href, KOMOOT_WEB_BASE).toString()
    }

    return this.defaultCoordinatesUrl(id)
  }

  private async fetchCoordinates(
    url: string,
    mode: KomootRequestMode = 'direct',
  ): Promise<KomootCoordinate[]> {
    const response = await this.fetchKomootJson(url, mode)
    const items = this.coordinateItems(response)

    return items
      .map((item) => parseCoordinate(item))
      .filter((coordinate): coordinate is KomootCoordinate => coordinate !== null)
  }

  private coordinateItems(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response
    }

    if (!isRecord(response)) {
      return []
    }

    const coordinatesResponse: KomootCoordinatesResponse = response

    return Array.isArray(coordinatesResponse.items) ? coordinatesResponse.items : []
  }

  private async fetchPublicJson(url: string): Promise<unknown> {
    return this.fetchKomootJson(url, this.requestMode())
  }

  private async fetchPublicText(url: string): Promise<string> {
    return komootRequestText({
      mode: 'direct',
      pathOrUrl: url,
      accept: 'text/html',
    })
  }

  private async fetchKomootJson(
    pathOrUrl: string,
    mode: KomootRequestMode = 'direct',
    query?: Readonly<Record<string, string | number | boolean | null | undefined>>,
  ): Promise<unknown> {
    return komootRequestJson({
      mode,
      pathOrUrl,
      query,
      accept: 'application/hal+json',
      credentials: mode === 'server' ? this.credentials : null,
      onAuthorizationExpired: this.onAuthorizationExpired,
    })
  }
}
