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

**Stack:** React 19, Vite 8, Tailwind CSS 4, React Router 7, hls.js, TanStack Virtual, STOMP/WebSocket, Vitest.

**Entry:** `frontend/src/main.jsx` → `frontend/src/App.jsx`.

**Route groups:** public feed/watch/profile/legal/auth pages, authenticated following/friends/messages/settings/studio/explore/search pages, and role-gated admin pages.

**Config:** frontend env is resolved in `frontend/src/config/apiBase.js` and `frontend/src/config/appOrigin.js`. Dev proxy routes in `frontend/vite.config.js` forward `/api`, `/share`, `/oauth2`, `/login/oauth2`, and `/ws` to the backend.

**Run:** `cd frontend && npm install && npm run dev`.
