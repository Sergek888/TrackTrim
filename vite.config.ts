import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

type VercelApiHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>

type DevApiRequest = IncomingMessage & {
  query?: Record<string, string>
}

const komootDevRoutes = new Map([
  ['/login', '/api/komoot/login.ts'],
  ['/logout', '/api/komoot/logout.ts'],
  ['/proxy', '/api/komoot/proxy.ts'],
  ['/status', '/api/komoot/status.ts'],
  ['/tours/upload', '/api/komoot/tours/upload.ts'],
])

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const komootSessionSecret = env.KOMOOT_SESSION_SECRET

  return {
    plugins: [
      react(),
      {
        name: 'komoot-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/komoot', async (request, response) => {
            const url = new URL(request.url ?? '/', 'http://localhost')
            const path = url.pathname.replace(/\/+$/, '') || '/'
            const dynamicRoute = path.match(/^\/tours\/(\d+)\/(edit|delete)$/)
            const route = komootDevRoutes.get(path) ?? (
              dynamicRoute === null
                ? undefined
                : `/api/komoot/tours/[id]/${dynamicRoute[2]}.ts`
            )

            if (route === undefined) {
              response.statusCode = 404
              response.end(JSON.stringify({ error: 'Komoot API route was not found.' }))
              return
            }

            if (komootSessionSecret !== undefined) {
              process.env.KOMOOT_SESSION_SECRET = komootSessionSecret
            }

            const devRequest = request as DevApiRequest

            devRequest.query = Object.fromEntries(url.searchParams.entries())
            if (dynamicRoute?.[1] !== undefined) {
              devRequest.query.id = dynamicRoute[1]
            }

            const apiModule = await server.ssrLoadModule(route) as {
              default: VercelApiHandler
            }

            await apiModule.default(request, response)
          })
        },
      },
    ],
  }
})
