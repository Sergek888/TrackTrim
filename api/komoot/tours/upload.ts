import { z } from 'zod'
import { authorizeKomootRequest } from '../_auth.js'
import { readJsonBody, sendJson, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_http.js'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const uploadSchema = z.object({
  fileName: z.string().min(1),
  data: z.string(),
  encoding: z.enum(['text', 'base64']).default('text'),
  dataType: z.enum(['gpx', 'fit']),
  sport: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['private', 'friends', 'public']).optional(),
  timeInMotionSeconds: z.number().nonnegative().nullable().optional(),
})

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response)
    return
  }

  try {
    const body = uploadSchema.parse(await readJsonBody(request))
    const data = body.encoding === 'base64' ? Buffer.from(body.data, 'base64') : body.data
    const size = typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : data.byteLength
    if (size === 0 || size > MAX_UPLOAD_BYTES) {
      sendJson(response, 400, { ok: false, error: 'Komoot upload size is invalid.' })
      return
    }
    if (
      (body.dataType === 'gpx' && !/\.gpx$/i.test(body.fileName)) ||
      (body.dataType === 'fit' && !/\.fit$/i.test(body.fileName))
    ) {
      sendJson(response, 400, { ok: false, error: 'Komoot upload file extension is invalid.' })
      return
    }

    const auth = await authorizeKomootRequest(request)
    if (!auth.ok) {
      sendJson(response, auth.statusCode, auth.payload)
      return
    }
    const result = await auth.komoot.mutations.uploadTour({ ...body, data })
    sendJson(response, result.ok ? 200 : result.status ?? 502, result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { ok: false, error: 'Komoot upload payload is invalid.' })
      return
    }
    sendJson(response, 502, {
      ok: false,
      error: error instanceof Error ? error.message : 'Komoot upload failed.',
    })
  }
}
