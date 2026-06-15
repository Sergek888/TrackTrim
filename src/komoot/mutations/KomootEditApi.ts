import type { KomootEditTourInput, KomootMutationResult, KomootTour } from '../shared/KomootTypes.js'

export interface KomootEditApi {
  editTour(id: string, patch: KomootEditTourInput): Promise<KomootMutationResult<KomootTour>>
}
