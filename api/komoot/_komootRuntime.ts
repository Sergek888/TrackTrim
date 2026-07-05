import {
  KomootApiClient,
  type KomootApiClientOptions,
} from '../../src/komoot/KomootApiClient.js'
import {
  KomootHttpClient,
  type KomootHttpClientOptions,
} from '../../src/komoot/transport/KomootHttpClient.js'
import { KomootRequestQueue } from '../../src/komoot/transport/KomootRequestQueue.js'

const komootRequestQueue = new KomootRequestQueue(3)

export function createKomootApiClient(options: KomootApiClientOptions = {}): KomootApiClient {
  return new KomootApiClient({
    ...options,
    queue: komootRequestQueue,
  })
}

export function createKomootHttpClient(options: KomootHttpClientOptions = {}): KomootHttpClient {
  return new KomootHttpClient({
    ...options,
    queue: komootRequestQueue,
  })
}
