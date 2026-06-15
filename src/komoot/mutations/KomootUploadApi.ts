import type {
  KomootMutationResult,
  KomootUploadedTour,
  KomootUploadTourInput,
} from '../shared/KomootTypes.js'

export interface KomootUploadApi {
  uploadTour(input: KomootUploadTourInput): Promise<KomootMutationResult<KomootUploadedTour>>
}
