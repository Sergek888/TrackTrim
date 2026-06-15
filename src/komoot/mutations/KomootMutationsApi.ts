import type {
  KomootDeleteTourOptions,
  KomootEditTourInput,
  KomootMutationResult,
  KomootTour,
  KomootUploadedTour,
  KomootUploadTourInput,
} from '../shared/KomootTypes.js'
import { isRecord, stringValue } from '../shared/KomootUtils.js'
import { tourFromResponse } from '../normalize/KomootTourNormalizer.js'
import { KomootApiError, KomootMutationError } from '../transport/KomootErrors.js'
import type { KomootHttpClient } from '../transport/KomootHttpClient.js'
import type { KomootDeleteApi } from './KomootDeleteApi.js'
import type { KomootEditApi } from './KomootEditApi.js'
import type { KomootUploadApi } from './KomootUploadApi.js'

export interface KomootMutationsApi extends KomootUploadApi, KomootEditApi, KomootDeleteApi {}

export class DefaultKomootMutationsApi implements KomootMutationsApi {
  public constructor(private readonly http: KomootHttpClient) {}

  public async uploadTour(
    input: KomootUploadTourInput,
  ): Promise<KomootMutationResult<KomootUploadedTour>> {
    if (input.fileName.trim() === '' || input.name.trim() === '' || input.sport.trim() === '') {
      throw new KomootMutationError('Komoot upload metadata is incomplete.')
    }

    try {
      const raw = await this.http.postBinary('/tours/', input.data, {
        query: {
          data_type: input.dataType,
          sport: input.sport,
          status: input.status ?? 'private',
          name: input.name,
          time_in_motion: input.dataType === 'gpx' ? input.timeInMotionSeconds : undefined,
        },
        contentType: input.dataType === 'gpx' ? 'application/gpx+xml' : 'application/octet-stream',
        expectedStatuses: [201, 202],
      })
      const id = responseId(raw)
      if (id === null) {
        throw new KomootMutationError('Komoot upload response has no tour id.')
      }
      return {
        ok: true,
        item: { id, duplicateOfId: duplicateId(raw), raw },
        raw,
      }
    } catch (error) {
      return controlledMutationError(error)
    }
  }

  public async editTour(
    id: string,
    patch: KomootEditTourInput,
  ): Promise<KomootMutationResult<KomootTour>> {
    const body = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    )
    if (Object.keys(body).length === 0) {
      throw new KomootMutationError('Komoot tour patch must not be empty.')
    }

    try {
      const raw = await this.http.patchJson(`/tours/${id}`, body)
      return { ok: true, item: tourFromResponse(raw, id), raw }
    } catch (error) {
      return controlledMutationError(error)
    }
  }

  public async deleteTour(
    id: string,
    options: KomootDeleteTourOptions,
  ): Promise<KomootMutationResult<{ id: string }>> {
    if (options.confirmTourId !== id) {
      throw new KomootMutationError('Komoot tour confirmation does not match.')
    }

    try {
      const raw = await this.http.deleteJson(`/tours/${id}`)
      return { ok: true, item: { id }, raw }
    } catch (error) {
      return controlledMutationError(error)
    }
  }
}

function controlledMutationError<T>(error: unknown): KomootMutationResult<T> {
  if (error instanceof KomootApiError) {
    return { ok: false, error: error.message, status: error.status ?? undefined, raw: error.raw }
  }
  throw error
}

function responseId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }
  const raw = value.id ?? value.tour_id ?? value.tourId
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : null
}

function duplicateId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }
  return stringValue(value.duplicate_of ?? value.duplicateOfId)
}
