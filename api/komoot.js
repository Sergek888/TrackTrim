const KOMOOT_API_BASE = 'https://www.komoot.com/api/v007'
const KOMOOT_FALLBACK_API_BASE = 'https://api.komoot.de/v007'
const ALLOWED_KOMOOT_API_BASES = new Set([KOMOOT_API_BASE, KOMOOT_FALLBACK_API_BASE])

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

async function readBody(request) {
  if (Buffer.isBuffer(request.body)) {
    const text = request.body.toString('utf8')

    return text === '' ? {} : JSON.parse(text)
  }

  if (isRecord(request.body)) {
    return request.body
  }

  if (typeof request.body === 'string') {
    return request.body === '' ? {} : JSON.parse(request.body)
  }

  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const text = Buffer.concat(chunks).toString('utf8')

  return text === '' ? {} : JSON.parse(text)
}

function authHeader(auth) {
  if (!isRecord(auth) || typeof auth.email !== 'string' || typeof auth.password !== 'string') {
    return null
  }

  return `Basic ${Buffer.from(`${auth.email}:${auth.password}`, 'utf8').toString('base64')}`
}

function komootApiBase(value) {
  return typeof value === 'string' && ALLOWED_KOMOOT_API_BASES.has(value)
    ? value
    : KOMOOT_API_BASE
}

function buildKomootUrl(path, query, apiBase = KOMOOT_API_BASE) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('://')) {
    throw new Error('Komoot path is invalid.')
  }

  const base = komootApiBase(apiBase)
  const url = new URL(`${base}${path}`)

  if (
    (base === KOMOOT_API_BASE && url.pathname.startsWith('/api/v007/') === false) ||
    (base === KOMOOT_FALLBACK_API_BASE && url.pathname.startsWith('/v007/') === false)
  ) {
    throw new Error('Only Komoot API paths are allowed.')
  }

  if (isRecord(query)) {
    for (const [key, value] of Object.entries(query)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  try {
    const body = await readBody(request)
    const authorization = authHeader(body.auth)

    if (authorization === null) {
      sendJson(response, 400, { error: 'Komoot authorization is required.' })
      return
    }

    const method = body.method === 'GET' ? 'GET' : null

    if (method === null) {
      sendJson(response, 400, { error: 'Only GET Komoot requests are supported.' })
      return
    }

    const komootUrl = buildKomootUrl(body.path, body.query, body.apiBase)

    const komootResponse = await fetch(komootUrl, {
      method,
      headers: {
        accept: typeof body.accept === 'string' ? body.accept : 'application/hal+json',
        authorization,
      },
    })
    const contentType = komootResponse.headers.get('content-type')
    const payload = await komootResponse.text()

    response.statusCode = komootResponse.status
    response.setHeader('Content-Type', contentType ?? 'application/json; charset=utf-8')
    response.end(payload)
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot request could not be completed.',
    })
  }
}
