# React Architecture

## 1. Overview

SPA with **feature-first modules** under `src/features/*`. No Next.js — client-side routing only (`react-router-dom`).

## 2. Purpose

TikTok-like UX: full-screen vertical video, instant navigation, minimal bundle per route. Domains (feed, chat, studio, admin, …) stay independently navigable in the codebase.

## 3. Architecture

```
app/            → main, App, routes, providers, guards
features/       → auth, feed, post, profile, explore, search, chat,
                  notification, upload, studio, settings, admin, …
shared/         → api/client, Sidebar, config, seo, shared hooks/utils
store/          → AuthContext, useAuth (global session)
realtime/       → createStompClient, wsUrl, wsAuth, retry
security/       → anti-bot SDK, captcha
tests/          → Vitest setup
```

Each feature typically contains `pages/`, `components/`, `hooks/`, `utils/`, optional `store/` / `websocket/`, and `index.js` barrel exports.

## 4. System Design

- **Code splitting:** lazy `import()` of feature pages from `app/routes.jsx`
- **Imports:** `@/features/...`, `@/shared/...`, `@/store/...`
- **Styling:** Tailwind utility-first, dark theme default
- **Icons:** react-icons
- **HTTP:** mostly `shared/api/client.js` (`apiClient`); feature `api/` folders reserved for future split

## 5. Data Flow

Page/hook → `apiClient.*` → JSON → local state / feature or global context → UI.

## 6. Sequence (feed scroll)

`VerticalVideoFeed` (`features/feed/components`) → intersection observer → active index → `FeedVideoPlayer` → hls.js attach → prefetch next via `useFeedPrefetch` + `FeedPrefetchManager` (`features/feed/algorithms`).

## 7. Scaling (client)

- Virtualized lists (`@tanstack/react-virtual` in feed)
- Debounced global search (`features/search/hooks/useSearch`, `GET /api/search/suggest`)
- Explore uses separate `searchExplore` API when enabled
- Service worker for offline (roadmap)

## 8. Performance

- Lazy-loaded route chunks
- `scrollbar-none` utilities for native-feel UI
- Media windowing + HLS instance teardown off-screen

## 9. Security

- Session/cookies + cached user (see AuthContext); document tradeoffs in security docs
- Anti-bot headers on auth via `security/headers/buildAntiBotHeaders.js`

## 10–15.

Failures: HLS fatal → fallback UI; 401 → login redirect. Monitoring: Web Vitals, Sentry (roadmap).
