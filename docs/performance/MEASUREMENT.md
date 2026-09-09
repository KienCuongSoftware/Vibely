# Measure before optimizing

Vibely already has Spring Boot Actuator. This playbook wires **percentiles**, **k6**, and **where to look** (Java vs PostgreSQL vs Redis).

Do **not** load-test `https://www.vibely.sbs` for this work. Use `http://localhost:8080`.

```
                 k6
                  │
                  │ 10 → 50 → 100 → 250 → 500 VUs
                  ▼
           ┌─────────────┐
           │ Spring Boot │  /actuator/metrics  /actuator/prometheus
           └──────┬──────┘
                  │
          ┌───────┴────────┐
          ▼                ▼
     PostgreSQL          Redis
```

## 1. Tools

| Tool | Role |
|------|------|
| k6 | Synthetic load |
| Actuator + Micrometer | HTTP p50/p95/p99, JVM, Hikari |
| `EXPLAIN ANALYZE` | Query plan |
| `redis-cli INFO stats` | Cache hits |
| `docker stats` | CPU/RAM per container |

Install k6 (Windows): https://grafana.com/docs/k6/latest/set-up/install-k6/

## 2. Actuator (local / `dev` profile)

Already on in `application-dev.yaml`:

- `/actuator/health`
- `/actuator/metrics`
- `/actuator/prometheus`

Percentiles for `http.server.requests`: **0.5 / 0.95 / 0.99**.

Prod still exposes only `health` + `info` (no public Prometheus).

After backend is up:

```powershell
curl http://localhost:8080/actuator
curl "http://localhost:8080/actuator/metrics/http.server.requests"
```

Useful filters after a feed test:

```powershell
curl "http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/api/feed/for-you"
```

Look at `VALUE` for `percentile` 0.5 / 0.95 / 0.99 (seconds). p95/p99 matter more than average.

Hikari (pool pressure):

```powershell
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active
curl http://localhost:8080/actuator/metrics/hikaricp.connections.pending
```

JVM:

```powershell
curl http://localhost:8080/actuator/metrics/jvm.memory.used
```

## 3. HTTP time is not enough

If feed p99 is 800ms, split the cost:

| Layer | How to see it |
|-------|----------------|
| PostgreSQL | `docs/performance/sql/feed-explain.sql` |
| Redis | `docs/performance/redis-check.md` |
| Java + JSON | leftover after DB/Redis |

If Postgres CPU is 90% and Spring is 30%, **do not** start by rewriting Java.

## 4. k6 — start with For You feed

Vibely feed is **not** `/api/videos/feed`. Use:

| Intent | Path |
|--------|------|
| For You | `GET /api/feed/for-you?size=20` |
| Latest | `GET /api/feed?size=20` |

```powershell
cd D:\Worksplace\FullStack\Vibely\perf\k6
k6 run feed.js
```

Ramp (do not jump to 1000 VUs):

```powershell
k6 run feed-ramp.js
```

Stages in `feed-ramp.js`: 10 → 50 → 100 → 250 → 500 VUs.

While it runs, second terminal:

```powershell
docker stats
```

## 5. Five APIs (after feed baseline)

```powershell
k6 run core-apis.js
```

| Group | Request |
|-------|---------|
| Feed | `GET /api/feed/for-you?size=20` |
| Video | `GET /api/videos/{publicId}` (from feed JSON) |
| Search | `GET /api/search/videos?q=vibely` |
| Comments | `GET /api/videos/{publicId}/comments` |
| Profile | `GET /api/users/{username}` (author from feed) |

Override: `$env:BASE_URL="http://127.0.0.1:8080"; k6 run -e BASE_URL=$env:BASE_URL feed.js`

## 6. Baseline file

Copy numbers into [baseline.md](baseline.md). After a DB index change you should see **before vs after** p95, not a vibe.

## 7. Data volume

A DB with 20 videos will not show index problems. Seed toward production-like volume when you are ready to optimize (users / videos / comments / likes). Measurement scripts still work on a small local DB — just treat timings as a **floor**, not capacity.

## 8. Next

Only after a filled baseline: [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md).
