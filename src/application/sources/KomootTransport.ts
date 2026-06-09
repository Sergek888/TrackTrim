const KOMOOT_API_BASE = 'https://www.komoot.com/api/v007'
const KOMOOT_WEB_BASE = 'https://www.komoot.com'
const KOMOOT_FALLBACK_WEB_BASE = 'https://api.komoot.de'

export type KomootRequestMode = 'direct' | 'server'

export type KomootCredentials = {
  readonly email: string
  readonly password: string
}

type KomootRequestInput = {
  readonly mode: KomootRequestMode
  readonly pathOrUrl: string
  readonly accept: string
  readonly credentials?: KomootCredentials | null
  readonly query?: Readonly<Record<string, string | number | boolean | null | undefined>>
}

export class KomootTransportError extends Error {
  public constructor(
    message: string,
    public readonly status: number | null = null,
  ) {
    super(message)
  }
}

export async function komootRequestJson(input: KomootRequestInput): Promise<unknown> {
  const response = await komootRequest(input)

  return response.json()
}

export async function komootRequestText(input: KomootRequestInput): Promise<string> {
  const response = await komootRequest(input)

  return response.text()
}

async function komootRequest(input: KomootRequestInput): Promise<Response> {
  const startedAt = Date.now()

  logKomootTransport('request', {
    mode: input.mode,
    target: input.pathOrUrl,
    query: input.query ?? {},
    hasCredentials: input.credentials !== null && input.credentials !== undefined,
  })

  try {
    const response = input.mode === 'server' ? await serverRequest(input) : await directRequest(input)

    logKomootTransport('response', {
      mode: input.mode,
      target: input.pathOrUrl,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    })

    return response
  } catch (error) {
    logKomootTransport('error', {
      mode: input.mode,
      target: input.pathOrUrl,
      elapsedMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'Unknown Komoot transport error.',
      status: error instanceof KomootTransportError ? error.status : null,
    })

    throw error
  }
}

function logKomootTransport(event: string, details: Record<string, unknown>): void {
  console.debug(`[komoot:transport:${event}]`, details)
}

async function directRequest(input: KomootRequestInput): Promise<Response> {
  const response = await safeFetch(urlFromPathOrUrl(input.pathOrUrl, input.query), {
    headers: {
      accept: input.accept,
    },
  })

  return assertKomootResponse(response)
}

async function serverRequest(input: KomootRequestInput): Promise<Response> {
  if (input.credentials === null || input.credentials === undefined) {
    throw new KomootTransportError('Komoot credentials are required for server requests.')
  }

  const response = await safeFetch('/api/komoot', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      method: 'GET',
      path: pathFromPathOrUrl(input.pathOrUrl),
      query: input.query ?? {},
      accept: input.accept,
      auth: input.credentials,
    }),
  })

  return assertKomootResponse(response)
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new KomootTransportError(
      'Komoot data is not reachable. Check the source or authorization.',
    )
  }
}

function assertKomootResponse(response: Response): Response {
  if (response.status === 401 || response.status === 403) {
    throw new KomootTransportError(
      'Komoot source is private or not available without authorization.',
      response.status,
    )
  }

  if (response.status === 404) {
    throw new KomootTransportError('Komoot source was not found.', response.status)
  }

  if (!response.ok) {
    throw new KomootTransportError('Komoot request failed.', response.status)
  }

  return response
}

function urlFromPathOrUrl(
  pathOrUrl: string,
  query?: KomootRequestInput['query'],
): string {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? new URL(pathOrUrl)
    : new URL(pathOrUrl, KOMOOT_API_BASE)

  appendQuery(url, query)

  return url.toString()
}

function pathFromPathOrUrl(pathOrUrl: string): string {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? new URL(pathOrUrl)
    : new URL(pathOrUrl, KOMOOT_API_BASE)

  if (url.origin !== KOMOOT_WEB_BASE && url.origin !== KOMOOT_FALLBACK_WEB_BASE) {
    throw new KomootTransportError('Only Komoot requests can use the server transport.')
  }

  if (url.origin === KOMOOT_FALLBACK_WEB_BASE && url.pathname.startsWith('/v007/')) {
    return `${url.pathname.slice('/v007'.length)}${url.search}`
  }

  if (!url.pathname.startsWith('/api/v007/')) {
    throw new KomootTransportError('Only Komoot API requests can use the server transport.')
  }

  return `${url.pathname.slice('/api/v007'.length)}${url.search}`
}

function appendQuery(url: URL, query?: KomootRequestInput['query']): void {
  if (query === undefined) {
    return
  }

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
}
