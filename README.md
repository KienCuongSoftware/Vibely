# Vibely

### A production-style, TikTok-inspired short-video social platform — Spring Boot, React, HLS streaming, Redis, and AWS S3.

[![Java](https://img.shields.io/badge/Java-17+-007396?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Vibely is a full-stack short-video platform engineered like a modern consumer social product — not a CRUD demo. It combines **cursor-based feeds**, **virtualized rendering**, **HLS adaptive streaming**, **FFmpeg transcoding**, **Redis caching**, **JWT authentication with refresh tokens**, and a **UUIDv7 public identity layer** on top of a high-performance internal relational schema.

Built for engineers who care about **real pagination**, **media pipelines**, **mobile-first UX**, and **production-oriented backend design**.

---

## Highlights

| Area | What Vibely does |
|------|------------------|
| **Feed** | TikTok-style infinite scroll with virtualization, media windowing, and HLS manifest prefetch |
| **Streaming** | FFmpeg → HLS segments → S3 → CDN-ready URLs → `hls.js` playback |
| **Identity** | Dual-key model: `BIGINT` internally, **UUIDv7 `publicId`** externally |
| **Auth** | JWT access tokens (15 min) + refresh tokens (14 days), OAuth (Google / Facebook / LINE) |
| **Performance** | Keyset pagination, batched feed queries, Redis share/redirect cache, aggressive client memory cleanup |
| **Studio** | Upload, post editing, per-video analytics, comment moderation UI |

---

## Features

### Feed & playback
- **Cursor-based infinite feed** with opaque keyset cursors (`FeedCursorCodec`)
- **Virtualized rendering** via TanStack Virtual — never mounts the full dataset
- **Media windowing** — typically **3–7 active `<video>` elements** at once
- **IntersectionObserver** visibility rules (play ≥ 70%, pause < 20%)
- **HLS-first playback** with tuned buffer limits and first-segment prefetch
- **Poster placeholders** for off-window slides (no hidden autoplay leaks)

### Backend & data
- **Spring Boot** REST API with consistent response envelope
- **PostgreSQL** + **Flyway** migrations, JPA/Hibernate
- **Keyset pagination** (`ORDER BY createdAt DESC, id DESC`) — no offset scanning on the hot feed path
- **Batched interaction counts** on feed pages (likes, comments, bookmarks, views)
- **Redis** for short-link cache, share counters, and rate-limit backing (optional but first-class)

### Media pipeline
- Presigned **S3 uploads** for raw video and thumbnails
- **FFmpeg** transcoding to multi-bitrate **HLS** (`.m3u8` + `.ts`)
- **Audio mastering** pipeline (loudness normalization, mobile-speaker optimization)
- Async **processing workers** with job state tracking
- Public paths organized by **`publicId`** — CDN-friendly, non-enumerable

### Security & identity
- **UUIDv7 public identifiers** for all video URLs and API routes
- Numeric-only IDs rejected at the API boundary
- **JWT + refresh token** rotation
- **OAuth 2.0 / OIDC** login (Google, Facebook, LINE) with onboarding flow
- Share links, redirect analytics, and idempotent share writes

### Creator studio
- Upload flow with cover picker and preview
- Post editor, analytics dashboard, comment management
- View/playthrough tracking for retention insights

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind CSS 4, TanStack Virtual, HLS.js, Vitest |
| **Backend** | Spring Boot 3.5, Spring Security, Spring Data JPA, Flyway, PostgreSQL |
| **Cache** | Redis 7 (Lettuce connection pool) |
| **Media** | FFmpeg, FFprobe, HLS (adaptive streaming) |
| **Storage** | AWS S3 (presigned upload + CDN-ready public URLs) |
| **Auth** | JWT (HS256), refresh tokens, OAuth 2.0 / OIDC |
| **Tooling** | Maven, ESLint, Docker Compose (Redis) |

---

## System architecture

```mermaid
flowchart TB
  subgraph Client
    UI[React SPA]
    VF[Virtualized Feed]
    HLS[hls.js Player]
    UI --> VF --> HLS
  end

  subgraph CDN["CDN / S3 public URLs"]
    M3U8[master.m3u8]
    TS[.ts segments]
    M3U8 --> TS
  end

  subgraph API["Spring Boot API"]
    Feed["/api/feed"]
    Videos["/api/videos"]
    Auth["/api/auth"]
    Share["/api/v1/share"]
  end

  subgraph Data
    PG[(PostgreSQL)]
    RD[(Redis)]
  end

  subgraph Workers
    FF[FFmpeg HLS Pipeline]
  end

  S3[(AWS S3)]

  HLS -->|GET manifest + segments| CDN
  UI -->|cursor pagination JSON| Feed
  UI -->|interactions JWT| Videos
  Feed --> PG
  Feed --> RD
  Share --> RD
  Videos --> PG
  Auth --> PG
  FF -->|write HLS| S3
  S3 --> CDN
  UI -->|presigned PUT| S3
```

**Request paths**

```
Watch:  Client ──► CDN ──► HLS segments
Feed:   Client ──► API ──► PostgreSQL (+ Redis cache)
Upload: Client ──► S3 (presigned) ──► Worker ──► S3 HLS prefix ──► CDN
```

---

## Feed architecture

The feed is designed for **virtually infinite scrolling** without rendering or buffering the entire catalog.

```
┌─────────────────────────────────────────────┐
│  React state: lightweight video metadata    │
│  (cursor-appended, soft-capped ~120 items)  │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  VirtualizedFeed (@tanstack/react-virtual)    │
│  • snap scroll, overscan = 1                  │
│  • IntersectionObserver → active index        │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  Media window (radius ±2) → max ~5 players    │
│  • HLS attach only inside window              │
│  • poster placeholder outside window          │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  FeedPrefetchManager                          │
│  • prefetch next 2 HLS manifests only         │
│  • warm next poster                           │
└─────────────────────────────────────────────┘
```

**Backend pagination**

- `GET /api/feed?cursor=<opaque>&size=8&sort=latest`
- Cursor encodes `{ id, createdAt }` via `FeedCursorCodec` (Base64url JSON)
- Query uses **keyset** `(createdAt, id)` — stable under concurrent inserts
- **No `OFFSET`** on the primary latest feed path

**Client tuning** (`frontend/src/feed/feedConfig.js`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `MEDIA_WINDOW_RADIUS` | 2 | Max ~5 HLS players |
| `PLAY_VISIBILITY_RATIO` | 0.70 | Autoplay threshold |
| `PAUSE_VISIBILITY_RATIO` | 0.20 | Pause off-screen slides |
| `PREFETCH_AHEAD_COUNT` | 2 | Manifest prefetch depth |

---

## UUIDv7 public identity

Vibely uses a **dual-key architecture** — internal performance, external opacity.

| Layer | Identifier | Used for |
|-------|------------|----------|
| Database | `BIGINT id` | PK/FK, joins, feed cursors |
| Public API | `UUID publicId` (v7) | URLs, share links, client cache keys |

**Example routes**

```
/watch/018fc2c7-f2e9-7a41-b9d7-0123456789ab
/@creator/video/018fc2c7-f2e9-7a41-b9d7-0123456789ab
GET /api/videos/018fc2c7-f2e9-7a41-b9d7-0123456789ab
```

**Why this matters**

- Prevents trivial **ID enumeration** (`/videos/1`, `/videos/2`, …)
- Keeps **B-tree index locality** and fast joins on `BIGINT`
- Feed cursors remain compact and index-friendly
- HLS objects stored under **`hls/{authorId}/{publicId}/`** — globally unique, CDN-safe paths

Legacy numeric routes are **rejected** — no silent fallback to internal IDs.

---

## Authentication

| Token | TTL | Storage |
|-------|-----|---------|
| Access (JWT) | **15 minutes** | Memory / client state |
| Refresh | **14 days** | HttpOnly-style client contract via API |

**Flow**

```mermaid
sequenceDiagram
  participant C as Client
  participant A as /api/auth
  participant DB as PostgreSQL

  C->>A: POST /login (email + password)
  A->>DB: validate credentials
  A-->>C: accessToken + refreshToken

  C->>A: GET /api/feed (Authorization: Bearer)
  Note over C,A: access token expires

  C->>A: POST /refresh (refreshToken)
  A-->>C: new accessToken (+ rotated refresh)

  C->>A: POST /logout
  A-->>C: invalidate refresh session
```

OAuth providers (Google, Facebook, LINE) exchange through a dedicated security filter chain, then issue the same JWT session model after onboarding (birth date, Vibely ID).

---

## Media pipeline

```
Upload (presigned S3 PUT)
        │
        ▼
Video record (status: RAW) + processing job enqueued
        │
        ▼
FFmpeg transcode ──► HLS renditions (multi-bitrate)
        │
        ├──► Audio analysis / loudness normalization
        │
        ▼
S3: hls/{authorId}/{publicId}/playlist.m3u8
        │
        ▼
CDN URL in API response (masterPlaylistUrl)
        │
        ▼
Client: hls.js adaptive playback
```

Raw uploads remain under `uploads/`; processed HLS lives under `hls/` — never mixed.

---

## Performance optimizations

| Layer | Technique |
|-------|-----------|
| **Feed API** | Keyset pagination, `JOIN FETCH author`, batched count queries (4/page vs 4×N) |
| **Redis** | Short-link cache, share counter mirror, redirect negative cache |
| **Frontend** | Virtualization, media windowing, `React.memo` on player, manifest-only prefetch |
| **HLS** | `maxBufferLength: 12s`, `backBufferLength: 0`, first-segment prefetch |
| **Memory** | Destroy HLS instances off-window; trim metadata list after long sessions |
| **Mobile** | Touch scroll, snap slides, small concurrent prefetch pool |

---

## API design

All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "error": { "status": 400, "message": "..." } }
```

### Feed (cursor pagination)

```http
GET /api/feed?size=8&sort=latest
GET /api/feed?size=8&sort=latest&cursor=eyJpZCI6OTk...
```

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "publicId": "018fc2c7-f2e9-7a41-b9d7-0123456789ab",
        "title": "Morning routine",
        "masterPlaylistUrl": "https://cdn.example.com/hls/42/018fc2c7-…/playlist.m3u8",
        "thumbnailUrl": "https://cdn.example.com/thumbnails/….jpg",
        "likeCount": 1284,
        "commentCount": 89,
        "shareCount": 42,
        "viewCount": 18500,
        "authorUsername": "creator",
        "durationSeconds": 34,
        "status": "READY"
      }
    ],
    "hasNext": true,
    "nextCursor": "eyJpZCI6OTgsInQiOiIyMDI2…",
    "sort": "latest"
  }
}
```

### Video by public ID

```http
GET /api/videos/018fc2c7-f2e9-7a41-b9d7-0123456789ab
```

Numeric paths like `/api/videos/123` return **400 Bad Request**.

### Interactions

```http
POST   /api/videos/{publicId}/likes
DELETE /api/videos/{publicId}/likes
POST   /api/videos/{publicId}/bookmarks
GET    /api/videos/{publicId}/comments
POST   /api/videos/{publicId}/views
POST   /api/v1/videos/{publicId}/share
```

### Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/onboarding/complete
```

### Health

```http
GET /api/health/readiness
```

---

## Project structure

```
Vibely/
├── backend/                    # Spring Boot API
│   └── src/main/java/com/vibely/backend/
│       ├── auth/               # JWT, OAuth, onboarding
│       ├── feed/               # FeedCursorCodec, feed controllers
│       ├── interaction/        # Likes, comments, bookmarks, views
│       ├── processing/         # FFmpeg HLS pipeline, job workers
│       ├── share/              # Short links, analytics, Redis cache
│       ├── studio/             # Creator analytics API
│       └── video/              # Video domain, UUID public IDs
│   └── src/main/resources/db/migration/   # Flyway SQL + Java migrations
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── components/feed/    # VirtualizedFeed, FeedVideoPlayer
│       ├── feed/               # feedConfig, prefetch, trim helpers
│       ├── pages/              # Feed, Watch, Studio, Profile
│       └── api/                # API client
├── infra/                      # Lambda audio extract (optional)
├── docker-compose.yml          # Redis for local dev
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

---

## Local development

### Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.9+ |
| Node.js | 20+ |
| PostgreSQL | 14+ |
| FFmpeg / FFprobe | 6+ (on `PATH` or via `FFMPEG_PATH`) |
| Redis | 7+ (optional; enabled in `dev` profile) |

### 1. Start Redis

```bash
docker compose up -d redis
```

### 2. Database

Create a PostgreSQL database named `vibely` (or configure `DB_URL`).

### 3. Backend environment

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | *(required)* |
| `JWT_SECRET` | Signing key for JWT | change in production |
| `DB_URL` | JDBC URL | local PostgreSQL |
| `DB_USERNAME` | DB user | `postgres` |
| `REDIS_HOST` | Redis host | `localhost` |
| `APP_REDIS_ENABLED` | Enable Redis features | `true` in dev profile |
| `APP_S3_ENABLED` | Enable S3 uploads/HLS | `true` in dev profile |
| `AWS_S3_BUCKET` | S3 bucket name | — |
| `AWS_ACCESS_KEY_ID` | AWS credentials | — |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | — |
| `FFMPEG_PATH` | FFmpeg binary | `ffmpeg` |
| `FFPROBE_PATH` | FFprobe binary | `ffprobe` |
| `APP_PROCESSING_WORKER_ENABLED` | Run in-process HLS worker | `true` in dev |
| `CORS_ALLOWED_ORIGINS` | Frontend origin | `http://localhost:5173` |

```bash
cd backend
export DB_PASSWORD=your_password
export JWT_SECRET=your-local-secret-min-32-chars
mvn spring-boot:run
```

API: `http://localhost:8080`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` → backend)

### 5. Tests

```bash
# Backend
cd backend && mvn test

# Frontend
cd frontend && npm test
```

---

## Screenshots

> Add screenshots to `docs/screenshots/` and uncomment the lines below.

<!-- 
![For You feed](docs/screenshots/feed.png)
![Watch page](docs/screenshots/watch.png)
![Creator studio](docs/screenshots/studio.png)
![Mobile layout](docs/screenshots/mobile.png)
-->

| Feed | Studio |
|:----:|:------:|
| *screenshot coming soon* | *screenshot coming soon* |

---

## Roadmap

- [ ] **Recommendation engine** — personalized ranking beyond chronological / trending-lite
- [ ] **Push notifications** — follows, likes, comments
- [ ] **Real-time** — WebSocket live comment counts and presence
- [ ] **Mobile apps** — React Native client sharing the same API
- [ ] **Live streaming** — RTMP ingest → LL-HLS
- [ ] **AI moderation** — automated content safety pipeline
- [ ] **Distributed workers** — SQS/Kafka-driven transcoding fleet
- [ ] **First-page Redis cache** — hot feed edge cache with TTL invalidation
- [ ] **Following feed cursors** — keyset pagination for social graph feed

---

## Contributing

We welcome focused, production-quality contributions.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Fork and create a feature branch from `main`
3. Keep PRs scoped to a single concern
4. Run `mvn test` and `npm test` before opening
5. Follow existing code conventions (minimal diffs, no drive-by refactors)

Security issues: see [SECURITY.md](SECURITY.md) — please do not open public issues for vulnerabilities.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built as a production-oriented portfolio platform — feeds, media pipelines, and real engineering trade-offs.</sub>
</p>
