import { getTrackTrimSessionId } from './_cookies.js'
import type { ApiRequest } from './_http.js'
import { createKomootApiClient } from './_komootRuntime.js'
import { getKomootSessionStore, type StoredKomootSession } from './_sessionStore.js'
import type { KomootApiClient } from '../../src/komoot/KomootApiClient.js'

export type AuthorizedKomootContext =
  | { ok: true; session: StoredKomootSession; komoot: KomootApiClient }
  | { ok: false; statusCode: number; payload: unknown }

export async function authorizeKomootRequest(
  request: ApiRequest,
): Promise<AuthorizedKomootContext> {
  const sessionId = getTrackTrimSessionId(request)
  if (sessionId === null) {
    return { ok: false, statusCode: 401, payload: { connected: false } }
  }

  const store = getKomootSessionStore()
  const session = await store.get(sessionId)
  if (session === null) {
    await store.delete(sessionId)
    return { ok: false, statusCode: 401, payload: { connected: false, expired: true } }
  }

  return {
    ok: true,
    session,
    komoot: createKomootApiClient({ session: session.auth }),
  }
}
