# React Architecture

## 1. Overview

SPA with **page-level routes** and **component library** under `src/components`. No Next.js — client-side routing only.

## 2. Purpose

TikTok-like UX: full-screen vertical video, instant navigation, minimal bundle per route.

## 3. Architecture

```
pages/          → route targets (FeedPage, MessagesPage, …)
components/     → reusable UI (feed/, auth/, …)
feed/           → playback & prefetch logic
state/          → AuthContext global
api/client.js   → REST facade
security/       → anti-bot SDK
realtime/       → STOMP chat
```

## 4. System Design

- **Code splitting:** Vite dynamic `import()` on heavy routes (where applied)
- **Styling:** Tailwind utility-first, dark theme default
- **Icons:** react-icons

## 5. Data Flow

Page → `apiClient.*` → JSON → local state / context → UI.

## 6. Sequence (feed scroll)

`VerticalVideoFeed` → intersection observer → active index → `FeedVideoPlayer` → hls.js attach → prefetch next via `useFeedPrefetch`.

## 7. Scaling (client)

- Virtualized lists (`@tanstack/react-virtual` pattern in feed components)
- Debounced search on explore
- Service worker for offline (roadmap)

## 8. Performance

- Lazy load non-critical pages
- `scrollbar-none` utilities for native-feel UI
- Avoid re-render: memo on video cells

## 9. Security

- Tokens in `localStorage` (document tradeoff in security docs)
- Anti-bot headers on auth via `buildAntiBotHeaders()`

## 10–15.

Failures: HLS fatal error → fallback UI; 401 → redirect login. Monitoring: Web Vitals, Sentry (roadmap).
