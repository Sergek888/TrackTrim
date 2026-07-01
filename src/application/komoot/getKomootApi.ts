import type { KomootApi } from '../../komoot/KomootApi.js'

let komootApi: KomootApi | null = null

export function configureKomootApi(api: KomootApi): void {
  komootApi = api
}

export function getKomootApi(): KomootApi {
  if (komootApi === null) {
    throw new Error('Komoot API is not configured.')
  }

  return komootApi
}
