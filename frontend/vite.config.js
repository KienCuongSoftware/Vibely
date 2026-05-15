import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'vibely-no-store-public-videos',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathOnly = (req.url ?? '').split('?')[0]
          if (pathOnly.startsWith('/videos/')) {
            res.setHeader(
              'Cache-Control',
              'private, no-cache, no-store, must-revalidate',
            )
            res.setHeader('Pragma', 'no-cache')
            res.setHeader('Expires', '0')
          }
          next()
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
  },
})
