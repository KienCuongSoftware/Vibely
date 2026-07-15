# Project Overview

Current-code snapshot for Vibely. Prefer this + Flyway SQL over older aspirational docs.

## Repository shape

```text
Vibely/
├── backend/       # Spring Boot API, media, auth, realtime, Explore, CU, discovery
├── frontend/      # React/Vite SPA
├── mobile/        # Flutter client
├── ai-workers/    # originality + content-understanding Python workers
├── docs/
├── deploy/        # VPS Docker Compose / nginx samples
├── infra/         # Optional lambda examples
└── docker-compose.yml
```

## Frontend

React 19, Vite 8, React Router 7, Tailwind 4, hls.js, TanStack Virtual, STOMP, Vitest.

Key dirs: `pages/`, `components/`, `api/`, `feed/`, `realtime/`, `security/`. Routes in `App.jsx`.

## Backend

Spring Boot 3.5, Java 17, Security, JPA, Flyway, PostgreSQL, Redis (optional), WebSocket/STOMP, S3, FFmpeg, Actuator.

Package root: `com.vibely.backend`.

Important domains: `auth`, `account`, `security`, `video`, `feed`, `explore`, `search`, `interaction`, `chat`, `notification`, `share`, `storage`, `processing`, `studio`, `admin`, `antibot`, `user`, `discovery`, `contentunderstanding`, `originality`, `observability`.

Config: `application.yaml` / `application-dev.yaml` / `application-prod.yaml` + gitignored `application-local.yaml`.

## Data and media

Flyway: `backend/src/main/resources/db/migration/` — history through **V66** (gaps exist; inspect files). SQL is source of truth.

S3 presigned uploads; FFmpeg → HLS. Content Understanding + Originality workers use Qdrant; CU also uses RabbitMQ when enabled.

## Local commands

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Optional Redis
docker compose up -d redis

# Optional Kafka (anti-bot telemetry profile only)
docker compose --profile kafka up -d
```

Windows: `.\mvnw.cmd` instead of `./mvnw`.

## Environment notes

Frontend: `VITE_API_BASE_URL`, `VITE_BACKEND_ORIGIN`, `VITE_PUBLIC_APP_URL`

Backend (common): `DB_*`, `JWT_SECRET`, cookie/CORS origins, OAuth (Google / Facebook / LINE), SMTP OTP, Redis, S3/FFmpeg, optional `DISCOVERY_OPENAI_*`, CU (`APP_CU_*`, `APP_CU_RABBITMQ_*`, `APP_CU_QDRANT_*`).

Keep secrets out of git.
