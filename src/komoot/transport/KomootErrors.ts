export class KomootApiError extends Error {
  public constructor(message: string, public readonly status: number | null = null, public readonly raw?: unknown) {
    super(message)
  }
}

export class KomootAuthError extends KomootApiError {}
export class KomootNotFoundError extends KomootApiError {}
export class KomootRateLimitError extends KomootApiError {}
export class KomootParseError extends KomootApiError {}
export class KomootMutationError extends KomootApiError {}
export class KomootUploadError extends KomootMutationError {}
