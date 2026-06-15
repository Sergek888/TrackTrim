import type { KomootAuthApi } from './auth/KomootAuthApi'
import type { KomootCollectionsApi } from './collections/KomootCollectionsApi'
import type { KomootImportApi } from './import/KomootImportApi'
import type { KomootMutationsApi } from './mutations/KomootMutationsApi'
import type { KomootToursApi } from './tours/KomootToursApi'
import type { KomootUrlApi } from './url/KomootUrlApi'
import type { KomootUsersApi } from './users/KomootUsersApi'

export interface KomootApi {
  readonly auth: KomootAuthApi
  readonly users: KomootUsersApi
  readonly tours: KomootToursApi
  readonly collections: KomootCollectionsApi
  readonly mutations: KomootMutationsApi
  readonly import: KomootImportApi
  readonly urls: KomootUrlApi
}

export * from './shared/KomootTypes'
export * from './transport/KomootErrors'
export type { KomootRequestTransport, KomootTransportRequest } from './transport/KomootHttpClient'
