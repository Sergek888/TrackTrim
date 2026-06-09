import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

type VercelApiHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'komoot-api-dev',
      configureServer(server) {
        server.middlewares.use('/api/komoot', async (request, response) => {
          const apiModule = await import(new URL('./api/komoot.js', import.meta.url).href) as {
            default: VercelApiHandler
          }

          await apiModule.default(request, response)
        })
      },
    },
  ],
})
