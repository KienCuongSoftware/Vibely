# Vibely Frontend

React/Vite single-page web client for Vibely. This is not the stock Vite template; it contains the feed, watch, auth, studio, admin, explore, search, chat, settings, and public share flows used by the platform.

## Stack

- React 19 with React Router 7
- Vite 8 with `@vitejs/plugin-react`
- Tailwind CSS 4 through `@tailwindcss/vite`
- `hls.js` for browser HLS playback
- TanStack Virtual for the For You feed
- STOMP over WebSocket for chat/realtime UI
- Vitest + Testing Library for frontend tests

## Project Layout

```text
frontend/
├── src/
│   ├── api/          # API client facade and request helpers
│   ├── auth/         # auth-specific helpers
│   ├── components/   # reusable UI, feed, watch, search, captcha, chat pieces
│   ├── config/       # API base/origin and share origin resolution
│   ├── feed/         # feed tuning, HLS prefetch, trimming helpers
│   ├── hooks/        # browser/UI hooks
│   ├── pages/        # route-level pages
│   ├── realtime/     # STOMP/WebSocket integration
│   ├── security/     # anti-bot SDK, captcha, fingerprint/behavior telemetry
│   ├── state/        # app state stores/hooks
│   ├── test/         # Vitest setup
│   └── utils/        # shared utilities
├── vite.config.js
└── package.json
```

## Routes

Routes are declared in `src/App.jsx`. Public users can view `/foryou`, public profiles, public video URLs, legal pages, and auth pages. Authenticated users get following/friends/messages, settings, studio upload/edit/analytics/comment pages, explore/search, and role-gated admin routes under `/admin`.

Important route groups:

- Feed/watch: `/foryou`, `/watch/:publicId`, `/:username/video/:publicId`, `/:username/:publicId`
- Creator studio: `/vibelystudio/home`, `/vibelystudio/posts`, `/vibelystudio/upload`, `/vibelystudio/upload/post/:publicId`, `/vibelystudio/analytics/:publicId`
- Discovery: `/explore`, `/explore/view/:publicId`, `/search`, `/tag/:tag`
- Admin: `/admin`, `/admin/users`, `/admin/posts`, `/admin/posts/:publicId`

## Configuration

The frontend defaults to same-origin API calls and relies on Vite dev proxy routes for local development.

| Env var | Purpose |
|---------|---------|
| `VITE_API_BASE_URL` | Optional explicit API base. Empty means same-origin `/api`. |
| `VITE_BACKEND_ORIGIN` | OAuth/backend origin override for localhost desktop development. |
| `VITE_PUBLIC_APP_URL` | Public app origin used when share links must point at a tunnel/domain instead of localhost. |

Vite proxies `/api`, `/share`, `/oauth2`, `/login/oauth2`, and `/ws` to `http://localhost:8080` in development. It also has dev middleware for crawler previews on public video/share URLs.

## Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Start the backend at `http://localhost:8080` for API, OAuth, share preview, and WebSocket flows.

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview built assets
npm run lint     # ESLint
npm run test     # Vitest in run mode
```

More detailed docs live in `../docs/frontend/`.
