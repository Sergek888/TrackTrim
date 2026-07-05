import type { KomootAuthSession } from '../shared/KomootTypes.js'
import {
  KomootApiError,
  KomootAuthError,
  KomootNotFoundError,
  KomootParseError,
  KomootRateLimitError,
} from './KomootErrors.js'
import type { KomootRequestQueue } from './KomootRequestQueue.js'

export type KomootQuery = Readonly<Record<string, string | number | boolean | null | undefined>>

export type KomootRequestOptions = {
  readonly query?: KomootQuery
  readonly accept?: string
  readonly contentType?: string
  readonly body?: BodyInit | null
  readonly expectedStatuses?: readonly number[]
}

export type KomootTransportRequest = {
  readonly method: string
  readonly path: string
  readonly query?: KomootQuery
  readonly accept?: string
  readonly contentType?: string
  readonly body?: BodyInit | null
}

export type KomootRequestTransport = (
  request: KomootTransportRequest,
) => Promise<Response>

export type KomootHttpClientOptions = {
  readonly session?: KomootAuthSession | null
  readonly apiBaseUrl?: string
  readonly fetch?: typeof fetch
  readonly transport?: KomootRequestTransport
  readonly queue?: KomootRequestQueue
  readonly onAuthorizationExpired?: () => void
}

export class KomootHttpClient {
  private readonly fetcher: typeof fetch
  private readonly apiBaseUrl: string

  public constructor(private readonly options: KomootHttpClientOptions = {}) {
    this.fetcher = options.fetch ?? ((input, init) => fetch(input, init))
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://api.komoot.de/v007'
  }

  public getJson(path: string, query?: KomootQuery): Promise<unknown> {
    return this.requestParsed('GET', path, { query, accept: 'application/hal+json,application/json' })
  }

  public getText(path: string, query?: KomootQuery): Promise<string> {
    return this.requestParsed('GET', path, { query, accept: 'text/plain,text/html,application/gpx+xml' }) as Promise<string>
  }

  public getBinary(path: string, query?: KomootQuery): Promise<ArrayBuffer> {
    return this.requestParsed('GET', path, { query, accept: 'application/octet-stream' }) as Promise<ArrayBuffer>
  }

  public postJson(path: string, body?: unknown, query?: KomootQuery): Promise<unknown> {
    return this.requestParsed('POST', path, {
      query,
      body: JSON.stringify(body ?? {}),
      contentType: 'application/json',
      accept: 'application/hal+json,application/json',
    })
  }

  public patchJson(path: string, body: unknown, query?: KomootQuery): Promise<unknown> {
    return this.requestParsed('PATCH', path, {
      query,
      body: JSON.stringify(body),
      contentType: 'application/json',
      accept: 'application/hal+json,application/json',
    })
  }

  public deleteJson(path: string, query?: KomootQuery): Promise<unknown> {
    return this.requestParsed('DELETE', path, { query, accept: 'application/hal+json,application/json' })
  }

  public postBinary(
    path: string,
    payload: ArrayBuffer | Uint8Array | string,
    options: { query?: KomootQuery; contentType: string; expectedStatuses?: readonly number[] },
  ): Promise<unknown> {
    return this.requestParsed('POST', path, {
      ...options,
      body: payload as BodyInit,
      accept: 'application/json,application/hal+json',
    })
  }

  public async requestRaw(
    method: string,
    path: string,
    options: KomootRequestOptions = {},
  ): Promise<Response> {
    assertRelativePath(path)
    const run = () => this.options.transport === undefined
      ? this.directRequest(method, path, options)
      : this.options.transport({
          method,
          path,
          query: options.query,
          accept: options.accept,
          contentType: options.contentType,
          body: options.body,
        })
    const response = this.options.queue === undefined
      ? await run()
      : await this.options.queue.enqueue(run)

    if (response.status === 401 || response.status === 403) {
      this.options.onAuthorizationExpired?.()
    }

    return response
  }

  private async requestParsed(
    method: string,
    path: string,
    options: KomootRequestOptions,
  ): Promise<unknown> {
    const response = await this.request(method, path, options)
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

    try {
      if (contentType.includes('json')) {
        return await response.json()
      }

      if (contentType.includes('octet-stream')) {
        return await response.arrayBuffer()
      }

      return await response.text()
    } catch (error) {
      throw new KomootParseError('Komoot response could not be parsed.', response.status, error)
    }
  }

  private async request(
    method: string,
    path: string,
    options: KomootRequestOptions,
  ): Promise<Response> {
    const expected = options.expectedStatuses
    const response = await this.requestRaw(method, path, options)

    if (expected?.includes(response.status) === true || response.ok) {
      return response
    }

    return throwResponseError(response)
  }

  private directRequest(
    method: string,
    path: string,
    options: KomootRequestOptions,
  ): Promise<Response> {
    const url = new URL(path.replace(/^\/+/, ''), `${this.apiBaseUrl.replace(/\/+$/, '')}/`)
    appendQuery(url, options.query)
    const headers: Record<string, string> = {
      accept: options.accept ?? 'application/hal+json,application/json',
    }

    if (options.contentType !== undefined) {
      headers['content-type'] = options.contentType
    }

    if (this.options.session !== null && this.options.session !== undefined) {
      headers.authorization = basicAuthHeader(
        this.options.session.userId,
        this.options.session.apiToken,
      )
    }

    return this.fetcher(url, { method, headers, body: options.body })
  }
}

export function basicAuthHeader(username: string, password: string): string {
  const text = `${username}:${password}`
  const nodeBuffer = (globalThis as { Buffer?: { from(value: string, encoding: string): { toString(encoding: string): string } } }).Buffer
  const value = nodeBuffer === undefined
    ? btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    : nodeBuffer.from(text, 'utf8').toString('base64')
  return `Basic ${value}`
}

function assertRelativePath(path: string): void {
  if (!path.startsWith('/') || path.includes('://')) {
    throw new KomootApiError('Komoot path must be relative and start with "/".')
  }
}

function appendQuery(url: URL, query?: KomootQuery): void {
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
}

async function throwResponseError(response: Response): Promise<never> {
  const raw = await response.text().catch(() => '')

  if (response.status === 401 || response.status === 403) {
    throw new KomootAuthError('Komoot authorization failed.', response.status, raw)
  }
  if (response.status === 404) {
    throw new KomootNotFoundError('Komoot resource was not found.', response.status, raw)
  }
  if (response.status === 429) {
    throw new KomootRateLimitError('Komoot rate limit was reached.', response.status, raw)
  }

  throw new KomootApiError('Komoot request failed.', response.status, raw)
}
