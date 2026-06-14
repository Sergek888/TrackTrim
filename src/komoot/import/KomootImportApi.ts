import type {
  KomootImportResult,
  KomootShareOptions,
  KomootTarget,
  KomootTourSummary,
  KomootUserListType,
} from '../shared/KomootTypes'
import type { KomootCollectionsApi } from '../collections/KomootCollectionsApi'
import type { KomootToursApi } from '../tours/KomootToursApi'
import type { KomootUrlApi } from '../url/KomootUrlApi'

export interface KomootImportApi {
  importTarget(target: KomootTarget): Promise<KomootImportResult>
  importUrl(input: string, options?: { userListType?: KomootUserListType }): Promise<KomootImportResult>
  importTour(id: string, options?: KomootShareOptions): Promise<KomootImportResult>
  importCollection(id: string, options?: KomootShareOptions): Promise<KomootImportResult>
  importUserTours(userId: string, listType: KomootUserListType): Promise<KomootImportResult>
}

export class DefaultKomootImportApi implements KomootImportApi {
  public constructor(
    private readonly tours: KomootToursApi,
    private readonly collections: KomootCollectionsApi,
    private readonly urls: KomootUrlApi,
  ) {}

  public async importTarget(target: KomootTarget): Promise<KomootImportResult> {
    if (target.kind === 'tour') {
      return this.importTour(target.id, target)
    }
    if (target.kind === 'collection') {
      return this.importCollection(target.id, target)
    }
    return this.importUserTours(target.id, target.listType)
  }

  public importUrl(
    input: string,
    options: { userListType?: KomootUserListType } = {},
  ): Promise<KomootImportResult> {
    const target = this.urls.parse(input, options)
    if (target === null) {
      throw new Error('Komoot URL is not supported.')
    }
    return this.importTarget(target)
  }

  public async importTour(id: string, options: KomootShareOptions = {}): Promise<KomootImportResult> {
    const target: KomootTarget = { kind: 'tour', id, shareToken: options.shareToken }
    return {
      source: 'komoot',
      target,
      tracks: [await this.tours.getSummary(id, options)],
      collection: null,
      warnings: [],
    }
  }

  public async importCollection(
    id: string,
    options: KomootShareOptions = {},
  ): Promise<KomootImportResult> {
    const target: KomootTarget = { kind: 'collection', id, shareToken: options.shareToken }
    const [collection, tracks] = await Promise.all([
      this.collections.get(id, options).catch(() => null),
      this.collections.getTourSummaries(id, options),
    ])
    return {
      source: 'komoot',
      target,
      tracks,
      collection,
      warnings: tracks.length === 0 ? ['Komoot collection contains no readable tours.'] : [],
    }
  }

  public async importUserTours(
    userId: string,
    listType: KomootUserListType,
  ): Promise<KomootImportResult> {
    const tracks: KomootTourSummary[] = []
    const rawPages: unknown[] = []
    let pageNumber = 0
    let totalPages: number | null = null

    do {
      const page = listType === 'planned'
        ? await this.tours.getPlannedTours(userId, { page: pageNumber })
        : await this.tours.getRecordedTours(userId, { page: pageNumber })
      tracks.push(...page.items)
      rawPages.push(page.raw)
      totalPages = page.totalPages
      pageNumber += 1
      if (page.items.length === 0) {
        break
      }
    } while (totalPages !== null && pageNumber < totalPages)

    return {
      source: 'komoot',
      target: { kind: 'user', id: userId, listType },
      tracks: [...new Map(tracks.map((track) => [track.id, track])).values()],
      collection: null,
      warnings: [],
      raw: rawPages,
    }
  }
}
