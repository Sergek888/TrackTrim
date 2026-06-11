import { getTrackTrimSessionId } from './_cookies'
import type { ApiRequest } from './_http'
import { KomootClient, komootBasicAuthHeader } from './_KomootClient'
import { getKomootSessionStore, type StoredKomootSession } from './_sessionStore'

export type AuthorizedKomootContext =
  | {
      ok: true
      session: StoredKomootSession
      client: KomootClient
    }
  | {
      ok: false
      statusCode: number
      payload: unknown
    }

export async function authorizeKomootRequest(
  request: ApiRequest,
): Promise<AuthorizedKomootContext> {
  const sessionId = getTrackTrimSessionId(request)

  if (sessionId === null) {
    return { ok: false, statusCode: 401, payload: { connected: false } }
  }

  const session = await getKomootSessionStore().get(sessionId)

  if (session === null) {
    return { ok: false, statusCode: 401, payload: { connected: false } }
  }

  return {
    ok: true,
    session,
    client: new KomootClient({
      authorizationHeader: komootBasicAuthHeader(session.auth.email, session.auth.password),
    }),
  }
}
