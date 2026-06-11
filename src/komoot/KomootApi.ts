export type KomootUserListType = 'planned' | 'recorded'

export type KomootRequestMode = 'direct' | 'server'

export type KomootCredentials =
  {
    readonly kind: 'tracktrim-session'
  }

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

export interface KomootApi {
  parseTarget(input: string, listType?: KomootUserListType): KomootTarget | null
  getTargetType(input: string, listType?: KomootUserListType): KomootTarget['kind'] | null
  loadTrackSummaries(target: KomootTarget): Promise<readonly KomootTourSummary[]>
  loadTourSummary(id: string): Promise<KomootTourSummary>
  loadTourCoordinates(summary: KomootTourSummary): Promise<readonly KomootCoordinate[]>
  loadUserDisplayName(id: string, listType: KomootUserListType): Promise<string | null>
  getTourOriginalUrl(id: string): string
  getTourShareUrl(id: string): string
}
