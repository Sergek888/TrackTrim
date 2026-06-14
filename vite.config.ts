import { defineConfig } from 'vite'
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
])

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'komoot-api-dev',
      configureServer(server) {
        server.middlewares.use('/api/komoot', async (request, response) => {
          const url = new URL(request.url ?? '/', 'http://localhost')
          const path = url.pathname.replace(/\/+$/, '') || '/'
          const route = komootDevRoutes.get(path)

          if (route === undefined) {
            response.statusCode = 404
            response.end(JSON.stringify({ error: 'Komoot API route was not found.' }))
            return
          }

          const devRequest = request as DevApiRequest

          devRequest.query = Object.fromEntries(url.searchParams.entries())

          const apiModule = await server.ssrLoadModule(route) as {
            default: VercelApiHandler
          }

          await apiModule.default(request, response)
        })
      },
    },
  ],
})
