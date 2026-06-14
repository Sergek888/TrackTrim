import type {
  KomootCollection,
  KomootCollectionsQuery,
  KomootCompilationLine,
  KomootPage,
  KomootShareOptions,
  KomootTourSummary,
} from '../shared/KomootTypes'
import { embeddedItems } from '../shared/KomootUtils'
import { KomootAuthError, KomootNotFoundError } from '../transport/KomootErrors'
import type { KomootHttpClient } from '../transport/KomootHttpClient'
import {
  collectionFromResponse,
  collectionPageFromResponse,
  compilationLinesFromResponse,
} from '../normalize/KomootCollectionNormalizer'
import {
  summaryFromCompilationLineItem,
  summaryFromUserTourItem,
  uniqueTourSummaries,
} from '../normalize/KomootTourNormalizer'

export interface KomootCollectionsApi {
  getCollections(query?: KomootCollectionsQuery): Promise<KomootPage<KomootCollection>>
  getAddedCollections(query?: KomootCollectionsQuery): Promise<KomootPage<KomootCollection>>
  get(id: string, options?: KomootShareOptions): Promise<KomootCollection>
  getSummary(id: string, options?: KomootShareOptions): Promise<unknown>
  getCompilation(id: string, options?: KomootShareOptions): Promise<unknown>
  getCompilationLines(id: string, options?: KomootShareOptions): Promise<readonly KomootCompilationLine[]>
  getCompilationLinesExtended(id: string, options?: KomootShareOptions): Promise<readonly KomootCompilationLine[]>
  getTourSummaries(id: string, options?: KomootShareOptions): Promise<readonly KomootTourSummary[]>
}

export class DefaultKomootCollectionsApi implements KomootCollectionsApi {
  public constructor(
    private readonly http: KomootHttpClient,
    private readonly publicWebHttp: KomootHttpClient | null = null,
  ) {}

  public async getCollections(query: KomootCollectionsQuery = {}): Promise<KomootPage<KomootCollection>> {
    const page = query.page ?? 0
    return collectionPageFromResponse(
      await this.http.getJson('/collections/', { page, limit: query.limit }),
      page,
    )
  }

  public async getAddedCollections(query: KomootCollectionsQuery = {}): Promise<KomootPage<KomootCollection>> {
    const page = query.page ?? 0
    return collectionPageFromResponse(
      await this.http.getJson('/collections/added/', { page, limit: query.limit }),
      page,
    )
  }

  public async get(id: string, options: KomootShareOptions = {}): Promise<KomootCollection> {
    return collectionFromResponse(
      await this.http.getJson(`/collections/${id}`, shareQuery(options)),
      id,
    )
  }

  public getSummary(id: string, options: KomootShareOptions = {}): Promise<unknown> {
    return this.http.getJson(`/collections/${id}/summary`, shareQuery(options))
  }

  public getCompilation(id: string, options: KomootShareOptions = {}): Promise<unknown> {
    return this.http.getJson(`/collections/${id}/compilation/`, shareQuery(options))
  }

  public async getCompilationLines(
    id: string,
    options: KomootShareOptions = {},
  ): Promise<readonly KomootCompilationLine[]> {
    return compilationLinesFromResponse(
      await this.http.getJson(`/collections/${id}/compilation_lines/`, shareQuery(options)),
    )
  }

  public async getCompilationLinesExtended(
    id: string,
    options: KomootShareOptions = {},
  ): Promise<readonly KomootCompilationLine[]> {
    return compilationLinesFromResponse(
      await this.http.getJson(`/collections/${id}/compilation_lines_extended/`, shareQuery(options)),
    )
  }

  public async getTourSummaries(
    id: string,
    options: KomootShareOptions = {},
  ): Promise<readonly KomootTourSummary[]> {
    const candidates = [
      `/collections/${id}/compilation_lines_extended/`,
      `/collections/${id}/compilation_lines/`,
      `/collections/${id}/compilation/`,
    ]

    for (const path of candidates) {
      try {
        const raw = await this.http.getJson(path, shareQuery(options))
        const summaries = uniqueTourSummaries(
          embeddedItems(raw)
            .map((item) => summaryFromCompilationLineItem(item) ?? summaryFromUserTourItem(item))
            .filter((item): item is KomootTourSummary => item !== null),
        )
        if (summaries.length > 0) {
          return summaries
        }
      } catch (error) {
        if (
          !(error instanceof KomootNotFoundError) &&
          !(error instanceof KomootAuthError && error.status === 403)
        ) {
          throw error
        }
      }
    }

    if (this.publicWebHttp === null) {
      return []
    }

    try {
      const html = await this.publicWebHttp.getText(`/collection/${id}`)
      const ids = [...html.matchAll(/\/(?:tour|discover_tours|smart_tours)\/(\d+)/gi)]
        .map((match) => match[1])
        .filter((tourId): tourId is string => tourId !== undefined)
      return uniqueTourSummaries(ids.map((tourId) => ({
        id: tourId,
        name: null,
        date: null,
        distanceMeters: null,
        coordinatesUrl: `/tours/${tourId}/coordinates`,
        coordinates: null,
        sourceUrl: `https://www.komoot.com/tour/${tourId}`,
      })))
    } catch (error) {
      if (
        error instanceof KomootNotFoundError ||
        (error instanceof KomootAuthError && error.status === 403)
      ) {
        return []
      }
      throw error
    }
  }
}

function shareQuery(options: KomootShareOptions): Record<string, string | undefined> {
  return { share_token: options.shareToken ?? undefined }
}
