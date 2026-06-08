import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackMeta } from '../../model/TrackMeta'
import type { TrackPointInput } from '../../model/TrackPoint'
import {
  komootRequestJson,
  komootRequestText,
  KomootTransportError,
  type KomootCredentials,
  type KomootRequestMode,
} from './KomootTransport'
import type { TrackFormat, TrackSource } from './TrackSource'

const KOMOOT_TOUR_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:tour|discover_tours|smart_tours)\/(\d+)/i
const KOMOOT_COLLECTION_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?collection\/(\d+)/i
const KOMOOT_USER_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?user\/(\d+)(?:\/(?:tours|backfilled-tours))?/i
const KOMOOT_USER_ID_PATTERN = /^\d{6,}$/
const KOMOOT_TOUR_LINK_PATTERN =
  /\/(?:tour|discover_tours|smart_tours)\/(\d+)/gi
const KOMOOT_API_BASE = 'https://www.komoot.com/api/v007'
const KOMOOT_API_FALLBACK_BASE = 'https://api.komoot.de/v007'
const KOMOOT_WEB_BASE = 'https://www.komoot.com'

export type KomootUserListType = 'planned' | 'recorded'

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
    tours?: unknown
  }
  page?: {
    totalPages?: unknown
  }
}

type KomootSourceTarget =
  | { readonly tourId: string; readonly collectionId?: never; readonly userId?: never }
  | { readonly collectionId: string; readonly tourId?: never; readonly userId?: never }
  | {
      readonly userId: string
      readonly listType: KomootUserListType
      readonly tourId?: never
      readonly collectionId?: never
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

function parseCoordinate(value: unknown): TrackPointInput | null {
  if (!isRecord(value)) {
    return null
  }

  const lat = value.lat
  const lon = value.lng ?? value.lon

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null
  }

  const ele = value.alt ?? value.ele

  return {
    lat,
    lon,
    ele: typeof ele === 'number' ? ele : null,
    time: parseDate(value.t),
  }
}

function uniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

function extractTourIdsFromText(text: string): string[] {
  const ids: string[] = []

  for (const match of text.matchAll(KOMOOT_TOUR_LINK_PATTERN)) {
    const tourId = match[1]

    if (tourId !== undefined) {
      ids.push(tourId)
    }
  }

  return uniqueValues(ids)
}

export class KomootTrackSource implements TrackSource {
  public visible = true
  public expanded = true
  public order = 0

  private readonly target: KomootSourceTarget

  public constructor(
    public readonly url: string,
    public name: string,
    public color: string,
    userListType: KomootUserListType = 'planned',
    private readonly credentials: KomootCredentials | null = null,
  ) {
    const target = KomootTrackSource.parseTarget(url, userListType)

    if (target === null) {
      throw new Error('Komoot tour, collection, profile URL, or user id is invalid.')
    }

    this.target = target
  }

  public static canLoadUrl(
    url: string,
    userListType: KomootUserListType = 'planned',
  ): boolean {
    return KomootTrackSource.parseTarget(url, userListType) !== null
  }

  public static getTargetType(url: string): 'tour' | 'collection' | 'user' | null {
    const target = KomootTrackSource.parseTarget(url)

    if (target?.tourId !== undefined) {
      return 'tour'
    }

    if (target?.collectionId !== undefined) {
      return 'collection'
    }

    if (target?.userId !== undefined) {
      return 'user'
    }

    return null
  }

  public async loadTracks(): Promise<Track[]> {
    if (this.target.tourId !== undefined) {
      return [await this.loadTrackByTourId(this.target.tourId)]
    }

    if (this.target.userId !== undefined) {
      return this.loadUserTracks(this.target.userId, this.target.listType)
    }

    const collectionTracks = await this.fetchCollectionTracksFromCompilationLines(
      this.target.collectionId,
    )

    if (collectionTracks.length > 0) {
      return collectionTracks
    }

    const tourIds = await this.fetchCollectionTourIds(this.target.collectionId)

    if (tourIds.length === 0) {
      throw new Error('Komoot collection has no public tours or could not be read.')
    }

    const tracks: Track[] = []

    for (const tourId of tourIds) {
      tracks.push(await this.loadTrackByTourId(tourId))
    }

    return tracks
  }

  public async saveTrack(track: Track, format: TrackFormat): Promise<void> {
    if (format !== 'gpx') {
      throw new Error('Only GPX export is supported.')
    }

    const meta = track.meta
    const payload = gpxConverter.serialize(track.getPoints(), meta?.name ?? 'Komoot tour')

    if (typeof payload.data !== 'string') {
      throw new Error('GPX payload must be text.')
    }

    this.downloadText(
      payload.data,
      this.trimmedFileName(meta?.name ?? 'komoot-tour'),
      payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
    )
  }

  public getOriginalUrl(meta: TrackMeta): string | null {
    return `https://www.komoot.com/tour/${meta.remoteId}`
  }

  public getShareUrl(meta: TrackMeta): string | null {
    return this.getOriginalUrl(meta)
  }

  private static parseTarget(
    url: string,
    userListType: KomootUserListType = 'planned',
  ): KomootSourceTarget | null {
    const trimmedUrl = url.trim()
    const tourMatch = trimmedUrl.match(KOMOOT_TOUR_URL_PATTERN)

    if (tourMatch?.[1] !== undefined) {
      return { tourId: tourMatch[1] }
    }

    const collectionMatch = trimmedUrl.match(KOMOOT_COLLECTION_URL_PATTERN)

    if (collectionMatch?.[1] !== undefined) {
      return { collectionId: collectionMatch[1] }
    }

    const userMatch = trimmedUrl.match(KOMOOT_USER_URL_PATTERN)

    if (userMatch?.[1] !== undefined) {
      return { userId: userMatch[1], listType: userListType }
    }

    if (KOMOOT_USER_ID_PATTERN.test(trimmedUrl)) {
      return { userId: trimmedUrl, listType: userListType }
    }

    return null
  }

  private async loadTrackByTourId(
    tourId: string,
    mode: KomootRequestMode = 'direct',
  ): Promise<Track> {
    const tour = await this.fetchTour(tourId, mode)
    const coordinatesUrl = this.coordinatesUrlFromTour(tour, tourId)
    const points = await this.fetchCoordinates(coordinatesUrl, mode)

    if (points.length === 0) {
      throw new Error(`Komoot tour ${tourId} has no public coordinates.`)
    }

    const trackName =
      typeof tour.name === 'string' && tour.name.trim() !== ''
        ? tour.name
        : `Komoot tour ${tourId}`
    const meta = new TrackMeta(
      this,
      tourId,
      trackName,
      this.color,
      true,
      parseDate(tour.date),
      parseDistanceMeters(tour.distance_m ?? tour.distance),
    )

    return new TrackModel(points, meta)
  }

  private async loadUserTracks(
    userId: string,
    listType: KomootUserListType,
  ): Promise<Track[]> {
    const mode: KomootRequestMode = this.credentials === null ? 'direct' : 'server'
    const tourIds = await this.fetchUserTourIds(
      userId,
      listType,
      mode,
    )

    if (tourIds.length === 0) {
      return []
    }

    const tracks: Track[] = []

    for (const tourId of tourIds) {
      tracks.push(await this.loadTrackByTourId(tourId, mode))
    }

    return tracks
  }

  private async fetchCollectionTourIds(collectionId: string): Promise<string[]> {
    const apiTourIds = await this.fetchCollectionTourIdsFromApi(collectionId)

    if (apiTourIds.length > 0) {
      return apiTourIds
    }

    return this.fetchCollectionTourIdsFromHtml(collectionId)
  }

  private async fetchCollectionTracksFromCompilationLines(collectionId: string): Promise<Track[]> {
    try {
      const response = await this.fetchPublicJson(
        `${KOMOOT_API_BASE}/collections/${collectionId}/compilation_lines_extended/`,
      )
      const compilationResponse = response as KomootCompilationLinesResponse
      const items = Array.isArray(compilationResponse._embedded?.items)
        ? compilationResponse._embedded.items
        : []

      return items
        .map((item) => this.trackFromCompilationLineItem(item))
        .filter((track): track is Track => track !== null)
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

  private trackFromCompilationLineItem(item: unknown): Track | null {
    if (!isRecord(item)) {
      return null
    }

    const lineItem: KomootCompilationLineItem = item
    const remoteId =
      typeof lineItem.id === 'string' || typeof lineItem.id === 'number'
        ? String(lineItem.id)
        : null
    const geometry = Array.isArray(lineItem.geometry) ? lineItem.geometry : []

    if (remoteId === null || geometry.length === 0) {
      return null
    }

    const points = geometry
      .map((point) => parseCoordinate(point))
      .filter((point): point is TrackPointInput => point !== null)

    if (points.length === 0) {
      return null
    }

    const name =
      typeof lineItem.name === 'string' && lineItem.name.trim() !== ''
        ? lineItem.name
        : `Komoot tour ${remoteId}`
    const meta = new TrackMeta(
      this,
      remoteId,
      name,
      this.color,
      true,
      null,
      parseDistanceMeters(lineItem.distance),
    )

    return new TrackModel(points, meta)
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
    const candidateUrls = [
      this.url,
      `${KOMOOT_WEB_BASE}/collection/${collectionId}`,
    ]

    for (const url of candidateUrls) {
      try {
        const html = await this.fetchPublicText(url)
        const ids = extractTourIdsFromText(html)

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

  private async fetchUserTourIds(
    userId: string,
    listType: KomootUserListType,
    mode: KomootRequestMode = 'direct',
  ): Promise<string[]> {
    const apiTourIds = await this.fetchUserTourIdsFromApi(userId, listType, mode)

    if (apiTourIds.length > 0) {
      return apiTourIds
    }

    if (mode === 'server') {
      return []
    }

    return this.fetchUserTourIdsFromHtml(userId, listType)
  }

  private async fetchUserTourIdsFromApi(
    userId: string,
    listType: KomootUserListType,
    mode: KomootRequestMode,
  ): Promise<string[]> {
    const tourType = listType === 'planned' ? 'tour_planned' : 'tour_recorded'
    const ids: string[] = []
    const apiBases =
      mode === 'server' ? [KOMOOT_API_BASE] : [KOMOOT_API_BASE, KOMOOT_API_FALLBACK_BASE]

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
            mode === 'direct' &&
            error instanceof KomootTransportError &&
            (error.status === 401 || error.status === 403 || error.status === 404)
          ) {
            break
          }

          throw error
        }

        const userToursResponse = response as KomootUserToursResponse
        const tours = Array.isArray(userToursResponse._embedded?.tours)
          ? userToursResponse._embedded.tours
          : []

        ids.push(...tours.flatMap((tour) => this.extractUserTourIdsFromItem(tour)))

        const totalPages =
          typeof userToursResponse.page?.totalPages === 'number'
            ? userToursResponse.page.totalPages
            : page + 1

        page += 1

        if (page >= totalPages || tours.length === 0) {
          break
        }
      }

      if (ids.length > 0) {
        return uniqueValues(ids)
      }
    }

    return []
  }

  private async fetchUserTourIdsFromHtml(
    userId: string,
    listType: KomootUserListType,
  ): Promise<string[]> {
    const candidateUrls =
      listType === 'planned'
        ? [this.url, `${KOMOOT_WEB_BASE}/user/${userId}/tours`]
        : [
            this.url,
            `${KOMOOT_WEB_BASE}/user/${userId}/backfilled-tours`,
            `${KOMOOT_WEB_BASE}/user/${userId}/tours`,
          ]

    for (const url of uniqueValues(candidateUrls).filter((candidateUrl) =>
      /^https?:\/\//i.test(candidateUrl),
    )) {
      try {
        const html = await this.fetchPublicText(url)
        const ids = extractTourIdsFromText(html)

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
        ids.push(...extractTourIdsFromText(nestedValue))
        continue
      }

      ids.push(...this.extractTourIdsFromUnknown(nestedValue))
    }

    return uniqueValues(ids)
  }

  private extractUserTourIdsFromItem(item: unknown): string[] {
    if (!isRecord(item)) {
      return []
    }

    const id = item.id

    if (typeof id === 'string' || typeof id === 'number') {
      return [String(id)]
    }

    return this.extractTourIdsFromUnknown(item)
  }

  private async fetchTour(
    remoteId: string,
    mode: KomootRequestMode = 'direct',
  ): Promise<KomootTourResponse> {
    let response: unknown

    try {
      response = await this.fetchKomootJson(`${KOMOOT_API_BASE}/tours/${remoteId}`, mode)
    } catch (error) {
      if (
        !(error instanceof KomootTransportError) ||
        (error.status !== 403 && error.status !== 404)
      ) {
        throw error
      }

      response = await this.fetchKomootJson(
        `${KOMOOT_API_BASE}/discover_tours/${remoteId}`,
        mode,
      )
    }

    if (!isRecord(response)) {
      throw new Error('Komoot tour response is invalid.')
    }

    return response
  }

  private coordinatesUrlFromTour(tour: KomootTourResponse, remoteId: string): string {
    const href = tour._links?.coordinates?.href

    if (typeof href === 'string' && href.trim() !== '') {
      return new URL(href, KOMOOT_WEB_BASE).toString()
    }

    return `${KOMOOT_API_BASE}/tours/${remoteId}/coordinates`
  }

  private async fetchCoordinates(
    url: string,
    mode: KomootRequestMode = 'direct',
  ): Promise<TrackPointInput[]> {
    const response = await this.fetchKomootJson(url, mode)
    const items = this.coordinateItems(response)

    return items
      .map((item) => parseCoordinate(item))
      .filter((point): point is TrackPointInput => point !== null)
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
    return this.fetchKomootJson(url)
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
    })
  }

  private trimmedFileName(name: string): string {
    return name.trim().replace(/[^\w.-]+/g, '-').replace(/-+$/g, '') + '-trimmed.gpx'
  }

  private downloadText(text: string, fileName: string, type: string): void {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    link.click()

    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
