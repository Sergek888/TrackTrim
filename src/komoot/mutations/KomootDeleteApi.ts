import type { KomootDeleteTourOptions, KomootMutationResult } from '../shared/KomootTypes'

export interface KomootDeleteApi {
  deleteTour(id: string, options: KomootDeleteTourOptions): Promise<KomootMutationResult<{ id: string }>>
}
