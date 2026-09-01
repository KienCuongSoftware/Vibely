# Environments

## 1. Overview

| Env | Branch | API | Web | Data |
|-----|--------|-----|-----|------|
| **Local** | feature | `:8080` Spring | `:5173` Vite | Docker PG, optional Redis |
| **Production** | `main` | Docker → `:8080` on VPS | Static `/var/www/vibely` + Cloudflare | PG on VPS, Redis, S3, Qdrant, RabbitMQ (CU) |

There is no separate staging cluster today — production-like testing happens on the VPS with profile `dev`.

## 2. Configuration matrix

| Variable | Local | Prod (VPS) |
|----------|-------|------------|
| `app.redis.enabled` | optional (`APP_REDIS_ENABLED`) | `true` |
| `app.antibot.kafka-enabled` | `false` | optional |
| `spring.jpa.show-sql` | may be `true` in dev | `false` |
| JWT secret | dev env / local yaml | `/opt/vibely/vibely.env` |
| S3 / OAuth / SMTP | `application-local.yaml` | `application-local.yaml` on VPS |
| `APP_MODERATION_APPLY_DECISIONS` | often `false` (shadow) | set per ops policy |
| `APP_TRANSLATION_ENABLED` | optional | `true` + sidecar `:8002` |

## 3. Current VPS reality (vibely.sbs)

| Item | Value |
|------|-------|
| Public URL | https://vibely.sbs |
| Backend | Docker `vibely-backend`, **host network** → `127.0.0.1:8080` |
| Frontend | Host nginx → **`/var/www/vibely`** (sync from frontend Docker image) |
| Compose | `/opt/vibely/docker-compose.yml` |
| Env file | `/opt/vibely/vibely.env` |
| Imported YAML | `/opt/vibely/config/application-local.yaml` |
| Active Spring profile | `dev` (as configured today) |

Important env values:

| Variable | Purpose |
|----------|---------|
| `SPRING_PROFILES_ACTIVE=dev` | Active Spring profile |
| `SPRING_CONFIG_IMPORT=optional:file:/opt/vibely/config/application-local.yaml` | Local secrets |
| `OAUTH_PUBLIC_BASE_URL=https://vibely.sbs` | OAuth redirect base |
| `FRONTEND_BASE_URL=https://vibely.sbs` | Post-login redirects |
| `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_*` | Direct Facebook OAuth (avoid placeholder drift) |

**Legacy:** some docs reference `vibely.service` + JAR — still valid but Docker backend is the primary deploy path. See [deployment/README.md](README.md).

Keep provider secrets out of git. Rotate any credentials that were exposed in chat or screenshots.

## 4. Local frontend env

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Override API base (empty = same-origin `/api`) |
| `VITE_BACKEND_ORIGIN` | OAuth origin on localhost |
| `VITE_PUBLIC_APP_URL` | Share-link origin when using tunnels |

## 5. Future / aspirational

Blue/green ASG, RDS, Secrets Manager, WAF at edge — described in older roadmap docs; not the current VPS setup.
