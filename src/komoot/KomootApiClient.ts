import type { KomootApi } from './KomootApi.js'
import { KomootPasswordAuth } from './auth/KomootPasswordAuth.js'
import { DefaultKomootCollectionsApi } from './collections/KomootCollectionsApi.js'
import { DefaultKomootImportApi } from './import/KomootImportApi.js'
import { DefaultKomootMutationsApi } from './mutations/KomootMutationsApi.js'
import type { KomootAuthSession } from './shared/KomootTypes.js'
import { DefaultKomootToursApi } from './tours/KomootToursApi.js'
import {
  KomootHttpClient,
  type KomootRequestTransport,
} from './transport/KomootHttpClient.js'
import type { KomootRequestQueue } from './transport/KomootRequestQueue.js'
import { DefaultKomootUrlApi } from './url/KomootUrlApi.js'
import { DefaultKomootUsersApi } from './users/KomootUsersApi.js'

export type KomootApiClientOptions = {
  readonly session?: KomootAuthSession | null
  readonly apiBaseUrl?: string
  readonly fetch?: typeof fetch
  readonly transport?: KomootRequestTransport
  readonly queue?: KomootRequestQueue
  readonly onAuthorizationExpired?: () => void
}

export class KomootApiClient implements KomootApi {
  public readonly auth
  public readonly users
  public readonly tours
  public readonly collections
  public readonly mutations
  public readonly import
  public readonly urls

  public constructor(options: KomootApiClientOptions = {}) {
    const http = new KomootHttpClient(options)
    const publicWebHttp = options.transport !== undefined
      ? null
      : new KomootHttpClient({
          ...options,
          apiBaseUrl: 'https://www.komoot.com',
        })
    this.auth = new KomootPasswordAuth(options.fetch)
    this.urls = new DefaultKomootUrlApi()
    this.users = new DefaultKomootUsersApi(http, options.session?.userId ?? null)
    this.tours = new DefaultKomootToursApi(http)
    this.collections = new DefaultKomootCollectionsApi(http, publicWebHttp)
    this.mutations = new DefaultKomootMutationsApi(http)
    this.import = new DefaultKomootImportApi(this.tours, this.collections, this.urls)
  }
}
