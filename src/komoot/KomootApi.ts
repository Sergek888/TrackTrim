import type { KomootAuthApi } from './auth/KomootAuthApi.js'
import type { KomootCollectionsApi } from './collections/KomootCollectionsApi.js'
import type { KomootImportApi } from './import/KomootImportApi.js'
import type { KomootMutationsApi } from './mutations/KomootMutationsApi.js'
import type { KomootToursApi } from './tours/KomootToursApi.js'
import type { KomootUrlApi } from './url/KomootUrlApi.js'
import type { KomootUsersApi } from './users/KomootUsersApi.js'

export interface KomootApi {
  readonly auth: KomootAuthApi
  readonly users: KomootUsersApi
  readonly tours: KomootToursApi
  readonly collections: KomootCollectionsApi
  readonly mutations: KomootMutationsApi
  readonly import: KomootImportApi
  readonly urls: KomootUrlApi
}

export * from './shared/KomootTypes.js'
export * from './transport/KomootErrors.js'
export type { KomootRequestTransport, KomootTransportRequest } from './transport/KomootHttpClient.js'
export type { KomootRequestQueue } from './transport/KomootRequestQueue.js'
