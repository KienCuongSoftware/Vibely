import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'vibely-share-crawler-preview',
      configureServer(server) {
        const UUID =
          /^\/(?:watch|share\/video)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i
        const PROFILE =
          /^\/([^/]+)\/video\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i
        const CRAWLER =
          /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|googlebot|bot|crawl|spider/i

        server.middlewares.use((req, res, next) => {
          const pathOnly = (req.url ?? '').split('?')[0]
          const ua = String(req.headers['user-agent'] ?? '')
          if (!CRAWLER.test(ua)) {
            next()
            return
          }

          const watchMatch = pathOnly.match(UUID)
          const profileMatch = pathOnly.match(PROFILE)
          const publicId = watchMatch?.[1] ?? profileMatch?.[2]
          if (!publicId) {
            next()
            return
          }

          const target = `http://127.0.0.1:8080/share/video/${publicId}`
          fetch(target, { headers: { 'User-Agent': ua, Host: req.headers.host ?? 'localhost:5173', 'X-Forwarded-Host': req.headers.host ?? '', 'X-Forwarded-Proto': String(req.headers.host ?? '').includes('ngrok') ? 'https' : 'http' } })
            .then(async (upstream) => {
              const body = await upstream.text()
              res.statusCode = upstream.status
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(body)
            })
            .catch(() => next())
        })
      },
    },
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
    allowedHosts: true,
    proxy: {
      '/share': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.host) {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host)
            }
            const host = String(req.headers.host ?? '')
            const secure =
              req.headers['x-forwarded-proto'] === 'https' ||
              host.includes('ngrok')
            proxyReq.setHeader('X-Forwarded-Proto', secure ? 'https' : 'http')
          })
        },
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.host) {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host)
            }
            const host = String(req.headers.host ?? '')
            const secure =
              req.headers['x-forwarded-proto'] === 'https' ||
              host.includes('ngrok') ||
              host.includes('trycloudflare.com') ||
              host.includes('vibely.sbs')
            proxyReq.setHeader('X-Forwarded-Proto', secure ? 'https' : 'http')
          })
        },
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.host) {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host)
            }
            const host = String(req.headers.host ?? '')
            const secure =
              req.headers['x-forwarded-proto'] === 'https' ||
              host.includes('ngrok') ||
              host.includes('trycloudflare.com') ||
              host.includes('vibely.sbs')
            proxyReq.setHeader('X-Forwarded-Proto', secure ? 'https' : 'http')
          })
        },
      },
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.host) {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host)
            }
            const host = String(req.headers.host ?? '')
            const secure =
              req.headers['x-forwarded-proto'] === 'https' ||
              host.includes('ngrok') ||
              host.includes('trycloudflare.com') ||
              host.includes('vibely.sbs')
            proxyReq.setHeader('X-Forwarded-Proto', secure ? 'https' : 'http')
          })
        },
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
