export type ApiRequest = {
  method?: string
  query?: Record<string, string | string[] | undefined>
  cookies?: Record<string, string | undefined>
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
  [key: string]: unknown
}

export type ApiResponse = {
  statusCode?: number
  setHeader(name: string, value: string | string[]): void
  end(payload?: string): void
}

export function sendJson(response: ApiResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export function methodNotAllowed(response: ApiResponse): void {
  sendJson(response, 405, { error: 'Method not allowed.' })
}

export async function readJsonBody(request: ApiRequest): Promise<unknown> {
  const body = request.body

  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf8')

    return text === '' ? {} : JSON.parse(text)
  }

  if (typeof body === 'string') {
    return body === '' ? {} : JSON.parse(body)
  }

  if (body !== null && typeof body === 'object') {
    return body
  }

  const chunks: Buffer[] = []
  const stream = request as unknown as AsyncIterable<Buffer | string>

  if (typeof stream[Symbol.asyncIterator] === 'function') {
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
  }

  const text = Buffer.concat(chunks).toString('utf8')

  return text === '' ? {} : JSON.parse(text)
}

export function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
