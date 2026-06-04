# Vibely Engineering Documentation

Production-grade internal documentation for the Vibely short-video platform. This corpus is structured for staff engineers, SREs, security reviewers, and new hires onboarding to a TikTok-scale social product.

## Keeping docs aligned with code

Documentation drifts when the codebase changes. After **meaningful** changes (new APIs, migrations, auth/anti-bot behavior, feed/chat flows, infra), review the matching folder under `docs/` and update diagrams or tables that no longer match reality.

| If you change… | Review |
|----------------|--------|
| REST routes / envelopes | [api/](api/) |
| Flyway migrations | [database/](database/) |
| Auth, OAuth, captcha headers | [auth/](auth/), [anti-bot/](anti-bot/) |
| Feed / explore / video / search | [feed/](feed/), [explore/](explore/), [search/](search/) |
| Chat / WebSocket | [chat/](chat/), [architecture/WEBSOCKET_REALTIME.md](architecture/WEBSOCKET_REALTIME.md) |
| FFmpeg / S3 / CDN | [media/](media/) |
| Redis keys / Kafka topics | [backend/REDIS_KAFKA_INTEGRATION.md](backend/REDIS_KAFKA_INTEGRATION.md), [infra/](infra/) |

When working with an AI assistant on Vibely, ask it to **flag doc impact** at the end of tasks that touch these areas.

## Documentation principles

- **English only** — all files under `docs/` are written in English (product UI copy may be localized separately)
- **Architecture-first** — system boundaries, data flows, and failure modes before API details
- **Production-oriented** — scaling, observability, security, and operational runbooks
- **Code-aligned** — reflects the current monorepo (`backend/`, `frontend/`, `infra/`)
- **Microservice-ready** — documents modular monolith boundaries and extraction paths

## Global document template

Each major document follows:

1. Overview · 2. Purpose · 3. Architecture · 4. System Design · 5. Data Flow · 6. Sequence Flows · 7. Scaling Strategy · 8. Performance · 9. Security · 10. Failure Scenarios · 11. Recovery · 12. Tradeoffs · 13. Future Improvements · 14. Production Hardening · 15. Monitoring

## Documentation map

| Domain | Index | Primary documents |
|--------|-------|-------------------|
| Architecture | [architecture/README.md](architecture/README.md) | System overview, request lifecycle, events, CDN, WebSocket |
| Backend | [backend/README.md](backend/README.md) | Spring modules, DDD, Redis/Kafka |
| Frontend | [frontend/README.md](frontend/README.md) | React 19, Zustand, HLS, virtualization |
| Feed | [feed/README.md](feed/README.md) | Keyset pagination, ranking hooks |
| Media | [media/README.md](media/README.md) | FFmpeg HLS pipeline, S3, CDN |
| Auth | [auth/README.md](auth/README.md) | JWT, refresh rotation, OAuth |
| Anti-bot | [anti-bot/README.md](anti-bot/README.md) | Risk engine, captcha, telemetry |
| Explore | [explore/README.md](explore/README.md) | Discovery, trending, cache |
| Recommendation | [recommendation/README.md](recommendation/README.md) | Candidate/rank pipeline (roadmap) |
| Search | [search/README.md](search/README.md) | `/api/search/*`, `/search` UI, suggest cache |
| Notification | [notification/README.md](notification/README.md) | WebSocket fanout (roadmap) |
| Chat | [chat/README.md](chat/README.md) | STOMP, message requests |
| Moderation | [moderation/README.md](moderation/README.md) | Reports, takedown |
| Analytics | [analytics/README.md](analytics/README.md) | Views, studio, telemetry |
| Infra | [infra/README.md](infra/README.md) | Redis, Kafka, Docker, Nginx |
| Deployment | [deployment/README.md](deployment/README.md) | Environments, CI/CD |
| Observability | [observability/README.md](observability/README.md) | Metrics, Grafana, tracing |
| Security | [security/README.md](security/README.md) | Platform security model |
| Performance | [performance/README.md](performance/README.md) | Caching, HLS, DB |
| Database | [database/README.md](database/README.md) | Schema, migrations, indexing |
| API | [api/README.md](api/README.md) | REST contracts, errors |
| Testing | [testing/README.md](testing/README.md) | Test pyramid, load/security |
| Roadmap | [roadmap/README.md](roadmap/README.md) | MVP → scale milestones |

## Repository quick reference

```
Vibely/
├── backend/          # Spring Boot 3.5 modular monolith
├── frontend/         # React 19 + Vite SPA
├── docs/             # This documentation tree
├── infra/            # Lambda samples (audio extract)
└── docker-compose.yml
```

## Environments

| Environment | API | Web | Data |
|-------------|-----|-----|------|
| Local dev | `:8080` | `:5173` (Vite) | PostgreSQL local, Redis optional |
| Staging | TBD | CloudFront | Managed PG + Redis |
| Production | ALB + Nginx | CloudFront | Multi-AZ PG, Redis cluster, S3 |

## Ownership (recommended)

| Area | DRI team |
|------|----------|
| Feed & video | Core playback |
| Media pipeline | Infrastructure / processing |
| Auth & anti-bot | Security platform |
| Chat & realtime | Messaging |
| Explore & search | Discovery |
| Observability | SRE |

## Related external docs

- Root [README.md](../README.md) — local development quick start
- [CONTRIBUTING.md](../CONTRIBUTING.md) — contribution workflow
