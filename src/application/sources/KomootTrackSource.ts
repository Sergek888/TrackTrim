import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackMeta } from '../../model/TrackMeta'
import type { TrackPointInput } from '../../model/TrackPoint'
import type { TrackFormat, TrackSource } from './TrackSource'

const KOMOOT_TOUR_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:tour|discover_tours|smart_tours)\/(\d+)/i
const KOMOOT_API_BASE = 'https://www.komoot.com/api/v007'
const KOMOOT_WEB_BASE = 'https://www.komoot.com'

class KomootPublicApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number | null = null,
  ) {
    super(message)
  }
}

type KomootCoordinatesResponse = {
  items?: unknown
}

type KomootTourResponse = {
  name?: unknown
  date?: unknown
  _links?: {
    coordinates?: {
      href?: unknown
    }
  }
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

export class KomootTourTrackSource implements TrackSource {
  public visible = true
  public expanded = true
  public order = 0

  private readonly remoteId: string

  public constructor(
    public readonly url: string,
    public name: string,
    public color: string,
  ) {
    const remoteId = KomootTourTrackSource.parseTourId(url)

    if (remoteId === null) {
      throw new Error('Komoot tour URL is invalid.')
    }

    this.remoteId = remoteId
  }

  public static canLoadUrl(url: string): boolean {
    return KomootTourTrackSource.parseTourId(url) !== null
  }

  public async loadTracks(): Promise<Track[]> {
    const tour = await this.fetchTour(this.remoteId)
    const coordinatesUrl = this.coordinatesUrlFromTour(tour, this.remoteId)
    const points = await this.fetchCoordinates(coordinatesUrl)

    if (points.length === 0) {
      throw new Error('Komoot tour has no public coordinates.')
    }

    const trackName =
      typeof tour.name === 'string' && tour.name.trim() !== ''
        ? tour.name
        : `Komoot tour ${this.remoteId}`
    const meta = new TrackMeta(
      this,
      this.remoteId,
      trackName,
      this.color,
      true,
      parseDate(tour.date),
    )

    return [new TrackModel(points, meta)]
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

  private static parseTourId(url: string): string | null {
    const match = url.trim().match(KOMOOT_TOUR_URL_PATTERN)

    return match?.[1] ?? null
  }

  private async fetchTour(remoteId: string): Promise<KomootTourResponse> {
    let response: unknown

    try {
      response = await this.fetchPublicJson(`${KOMOOT_API_BASE}/tours/${remoteId}`)
    } catch (error) {
      if (
        !(error instanceof KomootPublicApiError) ||
        (error.status !== 403 && error.status !== 404)
      ) {
        throw error
      }

      response = await this.fetchPublicJson(`${KOMOOT_API_BASE}/discover_tours/${remoteId}`)
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

  private async fetchCoordinates(url: string): Promise<TrackPointInput[]> {
    const response = await this.fetchPublicJson(url)
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
    let response: Response

    try {
      response = await fetch(url, {
        headers: {
          accept: 'application/hal+json',
        },
      })
    } catch {
      throw new KomootPublicApiError(
        'Komoot public API is not reachable from the browser. Use local GPX import.',
      )
    }

    if (response.status === 401 || response.status === 403) {
      throw new KomootPublicApiError(
        'Komoot tour is private or not available without authorization.',
        response.status,
      )
    }

    if (response.status === 404) {
      throw new KomootPublicApiError('Komoot tour was not found.', response.status)
    }

    if (!response.ok) {
      throw new KomootPublicApiError('Komoot public API request failed.', response.status)
    }

    return response.json()
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
