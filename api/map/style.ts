import { firstQueryValue, methodNotAllowed, sendJson, type ApiRequest, type ApiResponse } from '../komoot/_http.js'

const allowedStyleHosts = new Set([
  'styles.gpx.studio',
  'raw.githubusercontent.com',
  'vectortiles.geo.admin.ch',
  'basemaps.linz.govt.nz',
  'maps.utagawavtt.com',
  'api.os.uk',
])

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response)
    return
  }

  const rawUrl = firstQueryValue(request.query?.url)
  if (rawUrl === undefined) {
    sendJson(response, 400, { error: 'Missing style url.' })
    return
  }

  let styleUrl: URL
  try {
    styleUrl = new URL(rawUrl)
  } catch {
    sendJson(response, 400, { error: 'Invalid style url.' })
    return
  }

  if (styleUrl.protocol !== 'https:' || !allowedStyleHosts.has(styleUrl.hostname)) {
    sendJson(response, 400, { error: 'Style host is not allowed.' })
    return
  }

  try {
    const upstream = await fetch(styleUrl, {
      headers: {
        accept: 'application/json, application/vnd.mapbox.style+json;q=0.9, */*;q=0.1',
      },
    })

    const text = await upstream.text()
    response.statusCode = upstream.status
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    response.end(text)
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Map style proxy request failed.',
    })
  }
}
