# Vibely Frontend

React/Vite SPA for Vibely: feed, watch, auth, studio, admin, explore, search, chat, settings, and public share flows.

## Stack

- React 19, React Router 7 (`react-router` overridden to 8.3.x for security advisories)
- Vite 8 + `@vitejs/plugin-react`
- Tailwind CSS 4 (`@tailwindcss/vite`)
- `hls.js`, TanStack Virtual, STOMP WebSocket
- **i18next** — 56 locales under `src/i18n/` (Vietnamese + English primary)
- Vitest + Testing Library
- Path alias `@/` → `src/` (`vite.config.js`, `jsconfig.json`)

## Architecture

**Feature-first** (not layer-first). Each domain owns its pages, components, hooks, utils, and feature store where needed.

```text
frontend/src/
├── app/                 # Bootstrap: main, App, routes, providers, guards
├── features/            # Business domains
│   ├── auth/
│   ├── feed/            # For You, Following, Friends + player/shells
│   ├── post/            # Watch, hashtag, sound, share video
│   ├── profile/
│   ├── explore/
│   ├── search/
│   ├── chat/
│   ├── notification/    # Activity panels + notification WS
│   ├── upload/
│   ├── studio/            # Creator dashboard, posts, review modal, analytics
│   ├── settings/
│   ├── support/           # Help center (/support)
│   ├── admin/
│   ├── comment/
│   ├── bookmark/
│   ├── report/
│   ├── legal/
│   └── …                # follow, reaction, media, moderation, user (scaffold)
├── shared/              # Cross-cutting: api client, Sidebar, config, seo, hooks
├── store/               # Global AuthContext / useAuth
├── realtime/            # Shared STOMP helpers (wsUrl, createStompClient, …)
├── security/            # Anti-bot SDK, captcha, fingerprint
├── tests/               # Vitest setup
└── index.css
```

Typical feature layout:

```text
features/<name>/
├── api/           # optional; most HTTP still via shared/api/client.js
├── components/
├── hooks/
├── pages/
├── store/         # feature React context when needed
├── utils/
├── websocket/     # chat / notification sockets
└── index.js       # public barrel exports
```

Import style: `@/features/...`, `@/shared/...`, `@/store/...` across modules; short relatives inside a feature are fine.

## Routes

Declared in `src/app/routes.jsx`, composed from `src/app/App.jsx`. Providers live in `src/app/providers/AppProviders.jsx`. Entry: `index.html` → `src/app/main.jsx`.

| Group | Paths |
|-------|--------|
| Feed / watch | `/foryou`, `/watch/:publicId`, `/:username/video/:publicId`, `/:username/:publicId` |
| Studio | `/vibelystudio/home`, `/posts`, `/upload`, `/upload/post/:publicId`, `/analytics/:publicId`, `/comment/:publicId` |
| Discovery | `/explore`, `/explore/view/:publicId`, `/search`, `/tag/:tag` |
| Social | `/following`, `/friends`, `/messages`, `/settings`, `/support` |
| Admin | `/admin`, `/admin/users`, `/admin/posts`, `/admin/moderation`, … |

Guests can open `/foryou`, public profiles/videos, legal, and auth. Authenticated users get the rest; admin is role-gated.

## Configuration

| Env var | Purpose |
|---------|---------|
| `VITE_API_BASE_URL` | Optional API base; empty = same-origin `/api` |
| `VITE_BACKEND_ORIGIN` | OAuth/backend origin for localhost desktop |
| `VITE_PUBLIC_APP_URL` | Public origin for share links (tunnel/domain) |

Resolved in `src/shared/config/apiBase.js` and `src/shared/config/appOrigin.js`.

Dev proxies (`vite.config.js`): `/api`, `/share`, `/oauth2`, `/login/oauth2`, `/ws` → `http://localhost:8080`.

## Run

Requires **Node.js 22.22+** (engine requirement from `react-router` 8.3 override).

```bash
npm install
npm run dev
```

App: `http://localhost:5173`. Backend: `http://localhost:8080`.

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview dist
npm run lint     # ESLint
npm run test     # Vitest
```

## Docs

- [docs/frontend/](../docs/frontend/) — architecture, routing, HLS, security SDK
- [docs/search/](../docs/search/) — search API + UI
- [docs/deployment/](../docs/deployment/) — Docker / VPS static sync
