# Project Overview

Code-aligned snapshot for Vibely (Sep 2026). When docs disagree with the repo, trust **code + Flyway SQL**.

## Repository shape

```text
Vibely/
├── backend/       # Spring Boot API — media, auth, chat, explore, CU, moderation
├── frontend/      # React 19 / Vite 8 SPA (feature-first)
├── mobile/        # Flutter client → https://vibely.sbs by default
├── ai-workers/    # Python: CU, originality, moderation, translation, ai-enhance
├── docs/
├── deploy/        # VPS Docker Compose, nginx, sync-frontend-static.sh
├── infra/         # Optional Lambda samples
└── docker-compose.yml
```

## Frontend

- **Stack:** React 19, Vite 8, React Router 7, Tailwind 4, hls.js, TanStack Virtual, STOMP, i18next, Vitest
- **Node:** 22.22+ required
- **Layout:** `app/` · `features/*` · `shared/` · `store/` · `security/` · `realtime/`
- **i18n:** 56 locale files under `frontend/src/i18n/` (Vietnamese + English are primary; others fallback to `en`)
- **Routes:** `src/app/routes.jsx` — see [frontend/README.md](../frontend/README.md)

Notable features: For You virtualization, watch page, explore/search, **Vibely Studio** (upload, drafts, schedule, analytics, TikTok-style review modal), settings, support page, admin moderation UI.

## Backend

- **Stack:** Spring Boot 3.5, Java 17, Security, JPA, Flyway, PostgreSQL, Redis (optional), WebSocket/STOMP, S3, FFmpeg
- **Package:** `com.vibely.backend`

Domains (non-exhaustive): `auth`, `account`, `video`, `feed`, `explore`, `search`, `interaction`, `chat`, `notification`, `share`, `storage`, `processing`, `studio`, `admin`, `antibot`, `moderation`, `contentunderstanding`, `originality`, `translation`, `enhancement`, `discovery`.

Config layers: `application.yaml`, `application-dev.yaml`, `application-prod.yaml`, gitignored `application-local.yaml`.

## Data & media

- **Flyway:** `backend/src/main/resources/db/migration/` — tip **`V97`** (`video_intended_privacy` for Studio review privacy hold). Version numbers may skip; count SQL files.
- **Upload:** presigned S3 → video row `RAW` → FFmpeg HLS → `READY`
- **Photo posts:** `media_kind=PHOTO`, up to 35 images (V96)
- **Workers:** CU + originality → Qdrant; moderation worker; NLLB translation sidecar; optional AI enhance ladder

## Production (current)

| Item | Value |
|------|-------|
| Public URL | https://vibely.sbs |
| Backend | Docker `kiencuongsoftware/vibely-backend:latest`, host network `:8080` |
| Frontend | Static SPA in `/var/www/vibely` (synced from frontend Docker image) |
| Compose | `/opt/vibely/docker-compose.yml` (see `deploy/vps/docker-compose.yml`) |
| Env | `/opt/vibely/vibely.env` + `config/application-local.yaml` |

Legacy **systemd + JAR** path may still exist on some hosts; Docker Compose is the documented primary path.

## Local commands

```bash
docker compose up -d redis

cd frontend && npm install && npm run dev    # :5173

cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # :8080
```

Windows: `.\mvnw.cmd` instead of `./mvnw`.

## Environment variables (common)

| Area | Variables |
|------|-----------|
| Database | `DB_PASSWORD`, `DB_URL`, `DB_USERNAME` |
| Auth | `JWT_SECRET`, OAuth client IDs/secrets, cookie secure flags |
| Storage | `APP_S3_ENABLED`, `AWS_*`, `FFMPEG_PATH` |
| Redis | `APP_REDIS_ENABLED`, `REDIS_HOST` |
| Moderation | `APP_MODERATION_ENABLED`, `APP_MODERATION_APPLY_DECISIONS` |
| Translation | `APP_TRANSLATION_ENABLED`, `APP_TRANSLATION_BASE_URL` |
| Frontend | `VITE_API_BASE_URL`, `VITE_BACKEND_ORIGIN`, `VITE_PUBLIC_APP_URL` |

Keep secrets out of git.

## Related docs

- [README.md](../README.md) — product overview + quick start
- [deployment/README.md](deployment/README.md) — VPS sync + Docker
- [moderation/README.md](moderation/README.md) — publication hold + Studio UX
