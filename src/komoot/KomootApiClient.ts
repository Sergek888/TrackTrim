import type { KomootApi } from './KomootApi.ts'
import { KomootPasswordAuth } from './auth/KomootPasswordAuth.ts'
import { DefaultKomootCollectionsApi } from './collections/KomootCollectionsApi.ts'
import { DefaultKomootImportApi } from './import/KomootImportApi.ts'
import { DefaultKomootMutationsApi } from './mutations/KomootMutationsApi.ts'
import type { KomootAuthSession } from './shared/KomootTypes.ts'
import { DefaultKomootToursApi } from './tours/KomootToursApi.ts'
import {
  KomootHttpClient,
  type KomootRequestTransport,
} from './transport/KomootHttpClient.ts'
import { DefaultKomootUrlApi } from './url/KomootUrlApi.ts'
import { DefaultKomootUsersApi } from './users/KomootUsersApi.ts'

export type KomootApiClientOptions = {
  readonly session?: KomootAuthSession | null
  readonly apiBaseUrl?: string
  readonly fetch?: typeof fetch
  readonly transport?: KomootRequestTransport
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
