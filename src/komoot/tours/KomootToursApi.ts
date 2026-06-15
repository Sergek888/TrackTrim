import type {
  KomootCoordinate,
  KomootPage,
  KomootShareOptions,
  KomootTour,
  KomootTourSummary,
  KomootUserToursQuery,
} from '../shared/KomootTypes.js'
import { embeddedItems, isRecord, numberValue } from '../shared/KomootUtils.js'
import { KomootAuthError, KomootNotFoundError } from '../transport/KomootErrors.js'
import type { KomootHttpClient } from '../transport/KomootHttpClient.js'
import {
  coordinatesFromResponse,
  summaryFromTourResponse,
  summaryFromUserTourItem,
  tourFromResponse,
  uniqueTourSummaries,
} from '../normalize/KomootTourNormalizer.js'

export interface KomootToursApi {
  get(id: string, options?: KomootShareOptions): Promise<KomootTour>
  getSummary(id: string, options?: KomootShareOptions): Promise<KomootTourSummary>
  getCoordinates(idOrSummary: string | KomootTourSummary): Promise<readonly KomootCoordinate[]>
  getTimeline(id: string, options?: KomootShareOptions): Promise<unknown>
  getImages(id: string, options?: KomootShareOptions): Promise<readonly unknown[]>
  getGpx(id: string, options?: KomootShareOptions): Promise<string | null>
  getUserTours(userId: string, query?: KomootUserToursQuery): Promise<KomootPage<KomootTourSummary>>
  getPlannedTours(userId: string, query?: Omit<KomootUserToursQuery, 'type'>): Promise<KomootPage<KomootTourSummary>>
  getRecordedTours(userId: string, query?: Omit<KomootUserToursQuery, 'type'>): Promise<KomootPage<KomootTourSummary>>
}

export class DefaultKomootToursApi implements KomootToursApi {
  public constructor(private readonly http: KomootHttpClient) {}

  public async get(id: string, options: KomootShareOptions = {}): Promise<KomootTour> {
    return tourFromResponse(await this.getTourResponse(id, options), id)
  }

  public async getSummary(id: string, options: KomootShareOptions = {}): Promise<KomootTourSummary> {
    return summaryFromTourResponse(await this.getTourResponse(id, options), id)
  }

  public async getCoordinates(idOrSummary: string | KomootTourSummary): Promise<readonly KomootCoordinate[]> {
    if (typeof idOrSummary !== 'string' && idOrSummary.coordinates !== null) {
      return idOrSummary.coordinates
    }
    const id = typeof idOrSummary === 'string' ? idOrSummary : idOrSummary.id
    const path = typeof idOrSummary === 'string'
      ? `/tours/${id}/coordinates`
      : normalizeApiPath(idOrSummary.coordinatesUrl) ?? `/tours/${id}/coordinates`
    return coordinatesFromResponse(await this.http.getJson(path))
  }

  public getTimeline(id: string, options: KomootShareOptions = {}): Promise<unknown> {
    return this.http.getJson(`/tours/${id}/timeline/`, shareQuery(options))
  }

  public async getImages(id: string, options: KomootShareOptions = {}): Promise<readonly unknown[]> {
    const value = await this.http.getJson(`/tours/${id}/images/`, shareQuery(options))
    return Array.isArray(value) ? value : embeddedItems(value)
  }

  public async getGpx(id: string, options: KomootShareOptions = {}): Promise<string | null> {
    try {
      return await this.http.getText(`/tours/${id}.gpx`, shareQuery(options))
    } catch (error) {
      if (
        !(error instanceof KomootNotFoundError) &&
        !(error instanceof KomootAuthError && error.status === 403)
      ) {
        throw error
      }
    }
    try {
      return await this.http.getText(`/tours/${id}/download`, { ...shareQuery(options), format: 'gpx' })
    } catch (error) {
      if (error instanceof KomootNotFoundError) {
        return null
      }
      throw error
    }
  }

  public async getUserTours(
    userId: string,
    query: KomootUserToursQuery = {},
  ): Promise<KomootPage<KomootTourSummary>> {
    const page = query.page ?? 0
    const raw = await this.http.getJson(`/users/${userId}/tours/`, {
      type: query.type === undefined ? undefined : mapTourType(query.type),
      page,
      limit: query.limit,
      status: query.status,
      sport: query.sport,
      start_date: serializeDate(query.startDate),
      end_date: serializeDate(query.endDate),
      sort: query.sort,
      sort_field: query.sortField,
    })
    const items = uniqueTourSummaries(
      embeddedItems(raw)
        .map((item) => summaryFromUserTourItem(item, query.type ?? null))
        .filter((item): item is KomootTourSummary => item !== null),
    )
    const totalPages = isRecord(raw) && isRecord(raw.page)
      ? numberValue(raw.page.totalPages)
      : null
    return { items, page, totalPages, raw }
  }

  public getPlannedTours(
    userId: string,
    query: Omit<KomootUserToursQuery, 'type'> = {},
  ): Promise<KomootPage<KomootTourSummary>> {
    return this.getUserTours(userId, { ...query, type: 'planned' })
  }

  public getRecordedTours(
    userId: string,
    query: Omit<KomootUserToursQuery, 'type'> = {},
  ): Promise<KomootPage<KomootTourSummary>> {
    return this.getUserTours(userId, { ...query, type: 'recorded' })
  }

  private async getTourResponse(id: string, options: KomootShareOptions): Promise<unknown> {
    try {
      return await this.http.getJson(`/tours/${id}`, shareQuery(options))
    } catch (error) {
      if (!(error instanceof KomootNotFoundError)) {
        throw error
      }
      return this.http.getJson(`/discover_tours/${id}`, shareQuery(options))
    }
  }
}

export function mapTourType(value: 'planned' | 'recorded'): string {
  return value === 'planned' ? 'tour_planned' : 'tour_recorded'
}

function shareQuery(options: KomootShareOptions): Record<string, string | undefined> {
  return { share_token: options.shareToken ?? undefined }
}

function serializeDate(value: Date | string | undefined): string | undefined {
  return value instanceof Date ? value.toISOString() : value
}

function normalizeApiPath(value: string | null): string | null {
  if (value === null) {
    return null
  }
  if (value.startsWith('/')) {
    return value.replace(/^\/(?:api\/)?v007/, '')
  }
  try {
    return new URL(value).pathname.replace(/^\/(?:api\/)?v007/, '')
  } catch {
    return null
  }
}
