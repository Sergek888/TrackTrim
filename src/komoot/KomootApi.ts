export type KomootUserListType = 'planned' | 'recorded'

const KOMOOT_TOUR_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:tour|discover_tours|smart_tours)\/(\d+)/i
const KOMOOT_COLLECTION_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?collection\/(\d+)/i
const KOMOOT_USER_URL_PATTERN =
  /^https?:\/\/(?:www\.)?komoot\.[^/]+\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?user\/(\d+)(?:\/(?:tours|backfilled-tours))?/i
const KOMOOT_USER_ID_PATTERN = /^\d{6,16}$/

export type KomootTarget =
  | { readonly kind: 'tour'; readonly id: string }
  | { readonly kind: 'collection'; readonly id: string }
  | {
      readonly kind: 'user'
      readonly id: string
      readonly listType: KomootUserListType
    }

export type KomootCoordinate = {
  readonly lat: number
  readonly lon: number
  readonly elevation: number | null
  readonly time: Date | null
}

export type KomootTourSummary = {
  readonly id: string
  readonly name: string | null
  readonly date: Date | null
  readonly distanceMeters: number | null
  readonly coordinatesUrl: string | null
  readonly coordinates: readonly KomootCoordinate[] | null
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

export interface KomootApi {
  loadTrackSummaries(target: KomootTarget): Promise<readonly KomootTourSummary[]>
  loadTourSummary(id: string): Promise<KomootTourSummary>
  loadTourCoordinates(summary: KomootTourSummary): Promise<readonly KomootCoordinate[]>
  loadUserDisplayName(id: string, listType: KomootUserListType): Promise<string | null>
  getTourOriginalUrl(id: string): string
  getTourShareUrl(id: string): string
}
