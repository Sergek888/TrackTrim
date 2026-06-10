import { z } from 'zod'
import { authorizeKomootRequest } from '../_auth'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_http'
import { KomootHttpError, normalizeKomootTours } from '../_KomootClient'
import { parseKomootCollectionUrl } from '../_urlParsing'

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
    const parsed = parseKomootCollectionUrl(body.url)

    if (parsed === null) {
      sendJson(response, 400, { error: 'Komoot collection URL is invalid.' })
      return
    }

    const auth = await authorizeKomootRequest(request)

    if (!auth.ok) {
      sendJson(response, auth.statusCode, auth.payload)
      return
    }

    const collection = await auth.client.getCollection(parsed.collectionId, parsed.shareToken)
    const compilation = await auth.client.getCollectionCompilation(
      parsed.collectionId,
      parsed.shareToken,
    )

    sendJson(response, 200, {
      collection,
      compilation,
      tours: normalizeKomootTours(compilation),
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
      error: error instanceof Error ? error.message : 'Komoot collection could not be imported.',
    })
  }
}

