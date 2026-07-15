# Vibely Engineering Documentation

Internal documentation for the Vibely short-video platform. Prefer code + Flyway SQL as source of truth when docs disagree.

## Keeping docs aligned with code

After **meaningful** changes (APIs, migrations, auth, feed/chat, workers), update the matching folder under `docs/`.

| If you change… | Review |
|----------------|--------|
| REST routes | [api/](api/) |
| Flyway | [database/](database/), [erd/](erd/) |
| Auth / captcha | [auth/](auth/), [anti-bot/](anti-bot/) |
| Feed / explore / search / CU | [feed/](feed/), [explore/](explore/), [search/](search/), [architecture/content-understanding/](architecture/content-understanding/) |
| Chat / WebSocket / notifications | [chat/](chat/), [notification/](notification/), [architecture/WEBSOCKET_REALTIME.md](architecture/WEBSOCKET_REALTIME.md) |
| FFmpeg / S3 | [media/](media/) |
| Redis / optional Kafka | [backend/REDIS_KAFKA_INTEGRATION.md](backend/REDIS_KAFKA_INTEGRATION.md), [infra/](infra/) |

## Principles

- **English** under `docs/` (product UI may be Vietnamese)
- **Code-aligned** — no invented platforms
- **Architecture-first** for shipped systems

## Documentation map

Start with [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).

| Domain | Index |
|--------|-------|
| Architecture | [architecture/README.md](architecture/README.md) |
| Content Understanding | [architecture/content-understanding/00-INDEX.md](architecture/content-understanding/00-INDEX.md) |
| Backend | [backend/README.md](backend/README.md) |
| Frontend | [frontend/README.md](frontend/README.md) |
| Feed | [feed/README.md](feed/README.md) |
| Media | [media/README.md](media/README.md) |
| Auth | [auth/README.md](auth/README.md) |
| Anti-bot | [anti-bot/README.md](anti-bot/README.md) |
| Explore / Discovery | [explore/README.md](explore/README.md), [discovery/ARCHITECTURE.md](discovery/ARCHITECTURE.md) |
| Search | [search/README.md](search/README.md) |
| Notification | [notification/README.md](notification/README.md) |
| Chat | [chat/README.md](chat/README.md) |
| Moderation | [moderation/README.md](moderation/README.md) |
| Analytics | [analytics/README.md](analytics/README.md) |
| Infra | [infra/README.md](infra/README.md) |
| Deployment | [deployment/README.md](deployment/README.md) |
| Observability | [observability/README.md](observability/README.md) |
| Security | [security/README.md](security/README.md) |
| Performance | [performance/README.md](performance/README.md) |
| Database | [database/README.md](database/README.md) |
| API | [api/README.md](api/README.md) |
| Testing | [testing/README.md](testing/README.md) |
| Roadmap | [roadmap/README.md](roadmap/README.md) |

## Repository quick reference

```
Vibely/
├── backend/                 # Spring Boot modular monolith
├── frontend/                # React 19 + Vite SPA
├── mobile/                  # Flutter client
├── ai-workers/              # originality + content-understanding (Python)
├── docs/
├── deploy/                  # VPS compose / nginx samples
├── infra/                   # Lambda samples
└── docker-compose.yml
```

## Environments

| Environment | API | Web | Data |
|-------------|-----|-----|------|
| Local | `:8080` | `:5173` | PostgreSQL, Redis optional |
| Production (current) | Nginx → Spring on VPS | Static SPA `/var/www/vibely` | PG + Redis + S3 + Qdrant + RabbitMQ (CU) |

## Related

- Root [README.md](../README.md) — product overview + local quick start
- [CONTRIBUTING.md](../CONTRIBUTING.md)
