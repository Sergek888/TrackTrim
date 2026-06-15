import type { KomootDeleteTourOptions, KomootMutationResult } from '../shared/KomootTypes.js'

export interface KomootDeleteApi {
  deleteTour(id: string, options: KomootDeleteTourOptions): Promise<KomootMutationResult<{ id: string }>>
}
