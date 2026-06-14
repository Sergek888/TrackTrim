import type {
  KomootMutationResult,
  KomootUploadedTour,
  KomootUploadTourInput,
} from '../shared/KomootTypes'

export interface KomootUploadApi {
  uploadTour(input: KomootUploadTourInput): Promise<KomootMutationResult<KomootUploadedTour>>
}
