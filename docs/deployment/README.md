# Deployment

| File | Description |
|------|-------------|
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | Local, staging, prod |
| [CI_CD.md](CI_CD.md) | Pipeline, rollback |

## Quick start (local)

1. PostgreSQL + `DB_PASSWORD`
2. `docker compose up -d redis`
3. `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev`
4. `cd frontend && npm run dev`

See root [README.md](../../README.md).
