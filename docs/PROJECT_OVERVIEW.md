# Project Overview

This document is the current-code snapshot for Vibely. Use it as the first stop when onboarding or checking whether deeper docs still match the repository.

## Repository Shape

```text
Vibely/
├── backend/   # Spring Boot API, media pipeline, auth, realtime, data access
├── frontend/  # React/Vite web SPA
├── mobile/    # Flutter mobile client
├── docs/      # Architecture, API, domain, database, deployment docs
├── infra/     # Optional infra examples such as lambda-audio-extract
├── deploy/    # Deployment assets/scripts
└── scripts/   # Utility scripts
```

## Frontend

The web client lives in `frontend/` and uses React 19, Vite 8, React Router 7, Tailwind CSS 4, hls.js, TanStack Virtual, STOMP/WebSocket, and Vitest.

Key source directories:

- `frontend/src/pages/`: route-level pages for feed, auth, studio, admin, profile, explore, search, messages, settings, legal, and watch flows.
- `frontend/src/components/`: shared UI plus feed/watch/search/captcha/chat components.
- `frontend/src/api/`: API client facade.
- `frontend/src/feed/`: feed playback, prefetch, and memory tuning.
- `frontend/src/realtime/`: WebSocket/STOMP integration.
- `frontend/src/security/`: captcha, fingerprint, and behavior telemetry client code.
- `frontend/src/config/`: API base, backend origin, and public share origin resolution.

Routes are declared in `frontend/src/App.jsx`. Dev proxy configuration is in `frontend/vite.config.js`.

## Backend

The API lives in `backend/` and uses Spring Boot 3.5, Java 17, Spring Security, Spring Data JPA, Flyway, PostgreSQL, Redis support, optional Kafka telemetry, WebSocket/STOMP, AWS S3 SDK, FFmpeg/FFprobe integration, Actuator, and Lombok.

Main package root: `backend/src/main/java/com/vibely/backend/`.

Important domains include `auth`, `account`, `security`, `video`, `feed`, `explore`, `search`, `interaction`, `chat`, `notification`, `share`, `storage`, `processing`, `studio`, `admin`, `antibot`, `user`, `discovery`, and `observability`.

Configuration is split across:

- `backend/src/main/resources/application.yaml`
- `backend/src/main/resources/application-dev.yaml`
- `backend/src/main/resources/application-prod.yaml`
- optional gitignored `application-local.yaml`

## Data And Media

PostgreSQL schema changes are managed by Flyway migrations in `backend/src/main/resources/db/migration/`. The current migration history reaches `V44`; the SQL files are the source of truth.

Media uploads use S3 presigned URLs. Processing uses FFmpeg/FFprobe to produce HLS outputs and stores job state in the database. In dev, S3 and the processing worker are enabled by profile defaults, so local setup needs valid S3/FFmpeg config or explicit feature overrides.

## Local Commands

```bash
# Frontend
cd frontend
npm install
npm run dev
npm run test
npm run lint
npm run build

# Backend
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
./mvnw test
./mvnw package

# Optional local Redis
docker compose up -d redis

# Optional Kafka profile
docker compose --profile kafka up -d
```

On Windows PowerShell, use `.\mvnw.cmd` instead of `./mvnw`.

## Environment Notes

Frontend env:

- `VITE_API_BASE_URL`
- `VITE_BACKEND_ORIGIN`
- `VITE_PUBLIC_APP_URL`

Backend env:

- Database: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- JWT/cookies: `JWT_SECRET`, `APP_AUTH_EXPOSE_TOKENS_IN_API`, `APP_AUTH_COOKIE_SECURE`, `APP_AUTH_COOKIE_SAME_SITE`, `APP_AUTH_COOKIE_DOMAIN`
- Origins: `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, `SHORT_LINK_BASE_URL`, `CORS_ALLOWED_ORIGIN_PATTERNS`
- OAuth: Google, Facebook, and LINE client IDs/secrets
- Mail/OTP: `APP_MAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- Redis: `APP_REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- S3/media: `APP_S3_ENABLED`, `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `APP_S3_PUBLIC_URL_BASE`, `FFMPEG_PATH`, `FFPROBE_PATH`
- Discovery: `DISCOVERY_OPENAI_ENABLED`, `OPENAI_API_KEY`

Keep real secrets in environment variables or `application-local.yaml`; do not commit them.
