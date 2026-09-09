# Vibely Performance Baseline

Date:

Environment (local / staging — not production)

| Item | Value |
|------|--------|
| CPU | |
| RAM | |
| PostgreSQL | |
| Redis (`app.redis.enabled`) | |
| Spring Boot | `localhost:8080`, profile `dev` |
| k6 version | |

## GET /api/feed/for-you?size=20

| VUs | p50 | p95 | p99 | RPS | http_req_failed | notes |
|-----|-----|-----|-----|-----|-----------------|-------|
| 10 | | | | | | |
| 50 | | | | | | |
| 100 | | | | | | |
| 250 | | | | | | |
| 500 | | | | | | |

Actuator `http.server.requests` (uri `/api/feed/for-you`) after the run:

| percentile | seconds |
|------------|---------|
| 0.5 | |
| 0.95 | |
| 0.99 | |

`docker stats` at peak:

| container | CPU % | MEM |
|-----------|-------|-----|
| vibely-backend / java | | |
| postgres | | |
| redis | | |

## Other APIs (optional)

| API | VUs | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|-----|
| `GET /api/feed` | | | | | |
| `GET /api/videos/{id}` | | | | | |
| `GET /api/search/videos` | | | | | |
| `GET /api/videos/{id}/comments` | | | | | |
| `GET /api/users/{username}` | | | | | |

## EXPLAIN ANALYZE (feed)

Paste plan summary (Seq Scan vs Index Scan, execution time):

```
```

## Redis

| metric | value |
|--------|--------|
| keyspace_hits | |
| keyspace_misses | |
| hit ratio | |

## After a change

| | p95 feed | notes |
|--|----------|-------|
| Before | | |
| After | | |
