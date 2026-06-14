import { z } from 'zod'
import { authorizeKomootRequest } from '../../_auth.js'
import {
  firstQueryValue,
  readJsonBody,
  sendJson,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from '../../_http.js'

const editSchema = z.object({
  name: z.string().min(1).optional(),
  sport: z.string().min(1).optional(),
  status: z.enum(['private', 'friends', 'public']).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'Patch must not be empty.',
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const id = firstQueryValue(request.query?.id)
    if (id === undefined || !/^\d+$/.test(id)) {
      sendJson(response, 400, { ok: false, error: 'Komoot tour id is invalid.' })
      return
    }
    const patch = editSchema.parse(await readJsonBody(request))
    const auth = await authorizeKomootRequest(request)
    if (!auth.ok) {
      sendJson(response, auth.statusCode, auth.payload)
      return
    }
    const result = await auth.komoot.mutations.editTour(id, patch)
    sendJson(response, result.ok ? 200 : result.status ?? 502, result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { ok: false, error: 'Komoot edit payload is invalid.' })
      return
    }
    sendJson(response, 502, {
      ok: false,
      error: error instanceof Error ? error.message : 'Komoot edit failed.',
    })
  }
}
