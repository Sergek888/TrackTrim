import type { KomootEditTourInput, KomootMutationResult, KomootTour } from '../shared/KomootTypes'

export interface KomootEditApi {
  editTour(id: string, patch: KomootEditTourInput): Promise<KomootMutationResult<KomootTour>>
}
