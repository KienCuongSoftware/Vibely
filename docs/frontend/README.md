# Frontend Documentation

## File structure

```
docs/frontend/
├── README.md
├── REACT_ARCHITECTURE.md
├── STATE_AND_ROUTING.md
├── HLS_AND_FEED_UI.md
└── SECURITY_SDK.md

Related: ../search/ (global search API + UI)
```

**App root:** `frontend/`

**Stack:** React 19, Vite 8, Tailwind CSS 4, React Router 7 (+ `react-router` 8.3 override), hls.js, TanStack Virtual, STOMP/WebSocket, Vitest.

**Organization:** Feature-first under `frontend/src/features/*`. Bootstrap in `app/`, shared HTTP/UI in `shared/`, global auth in `store/`.

**Entry:** `frontend/src/app/main.jsx` → `AppProviders` → `frontend/src/app/App.jsx` → `frontend/src/app/routes.jsx`.

**Route groups:** public feed/watch/profile/legal/auth; authenticated following/friends/messages/settings/studio/explore/search; role-gated admin.

**Config:** `frontend/src/shared/config/apiBase.js`, `frontend/src/shared/config/appOrigin.js`. Dev proxy in `frontend/vite.config.js` forwards `/api`, `/share`, `/oauth2`, `/login/oauth2`, `/ws` to the backend. Alias `@/` → `src/`.

**Run:** `cd frontend && npm install && npm run dev` (Node **22.22+**).
