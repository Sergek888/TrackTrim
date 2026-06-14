export type KomootUserListType = 'planned' | 'recorded'
export type KomootVisibility = 'private' | 'friends' | 'public'

export type KomootTarget =
  | { readonly kind: 'tour'; readonly id: string; readonly shareToken?: string | null }
  | { readonly kind: 'collection'; readonly id: string; readonly shareToken?: string | null }
  | { readonly kind: 'user'; readonly id: string; readonly listType: KomootUserListType }

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
  readonly sport?: string | null
  readonly durationSeconds?: number | null
  readonly elevationUpMeters?: number | null
  readonly elevationDownMeters?: number | null
  readonly sourceUrl?: string | null
  readonly isPlanned?: boolean | null
  readonly isRecorded?: boolean | null
  readonly raw?: unknown
}

export type KomootTour = KomootTourSummary & { readonly raw: unknown }

export type KomootUser = {
  readonly id: string
  readonly displayName: string | null
  readonly raw: unknown
}

export type KomootCollection = {
  readonly id: string
  readonly name: string | null
  readonly description: string | null
  readonly sourceUrl: string | null
  readonly raw: unknown
}

export type KomootCompilationLine = {
  readonly id: string
  readonly name: string | null
  readonly distanceMeters: number | null
  readonly coordinates: readonly KomootCoordinate[] | null
  readonly raw: unknown
}

export type KomootPage<T> = {
  readonly items: readonly T[]
  readonly page: number
  readonly totalPages: number | null
  readonly raw: unknown
}

export type KomootImportResult = {
  readonly source: 'komoot'
  readonly target: KomootTarget
  readonly tracks: readonly KomootTourSummary[]
  readonly collection: KomootCollection | null
  readonly warnings: readonly string[]
  readonly raw?: unknown
}

export type KomootAuthSession = {
  readonly authMode: 'basic-token'
  readonly userId: string
  readonly apiToken: string
  readonly displayName: string | null
}

export type KomootShareOptions = { readonly shareToken?: string | null }

export type KomootUserToursQuery = {
  readonly type?: KomootUserListType
  readonly page?: number
  readonly limit?: number
  readonly status?: KomootVisibility
  readonly sport?: string
  readonly startDate?: Date | string
  readonly endDate?: Date | string
  readonly sort?: 'asc' | 'desc'
  readonly sortField?: string
}

export type KomootCollectionsQuery = {
  readonly page?: number
  readonly limit?: number
}

export type KomootUploadTourInput = {
  readonly fileName: string
  readonly data: ArrayBuffer | Uint8Array | string
  readonly dataType: 'gpx' | 'fit'
  readonly sport: string
  readonly name: string
  readonly status?: KomootVisibility
  readonly timeInMotionSeconds?: number | null
}

export type KomootEditTourInput = {
  readonly name?: string
  readonly sport?: string
  readonly status?: KomootVisibility
}

export type KomootDeleteTourOptions = { readonly confirmTourId: string }

export type KomootMutationResult<T> =
  | { readonly ok: true; readonly item: T; readonly raw: unknown }
  | { readonly ok: false; readonly error: string; readonly status?: number; readonly raw?: unknown }

export type KomootUploadedTour = {
  readonly id: string
  readonly duplicateOfId?: string | null
  readonly raw: unknown
}
