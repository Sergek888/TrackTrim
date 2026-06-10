import { z } from 'zod'
import { authorizeKomootRequest } from '../_auth'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_http'
import { KomootHttpError } from '../_KomootClient'
import { parseKomootTourUrl } from '../_urlParsing'

const importSchema = z.object({
  url: z.string().url(),
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const body = importSchema.parse(await readJsonBody(request))
    const parsed = parseKomootTourUrl(body.url)

    if (parsed === null) {
      sendJson(response, 400, { error: 'Komoot tour URL is invalid.' })
      return
    }

    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      sendJson(response, auth.statusCode, auth.payload)
      return
    }

    const tour = await auth.client.getTour(parsed.tourId, parsed.shareToken)
    const timeline = await optionalLoad(() =>
      auth.client.getTourTimeline(parsed.tourId, parsed.shareToken),
    )
    const gpx = await optionalLoad(() => auth.client.getTourGpx(parsed.tourId, parsed.shareToken))

    sendJson(response, 200, {
      trackDraft: {
        source: 'komoot',
        remoteId: parsed.tourId,
        originalUrl: body.url,
        tour,
        timeline,
        gpx,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: 'Import payload is invalid.' })
      return
    }

    if (error instanceof KomootHttpError && (error.status === 401 || error.status === 403)) {
      sendJson(response, 401, { connected: false, expired: true })
      return
    }

    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot tour could not be imported.',
    })
  }
}

async function optionalLoad<T>(loader: () => Promise<T>): Promise<T | null> {
  try {
    return await loader()
  } catch {
    return null
  }
}

