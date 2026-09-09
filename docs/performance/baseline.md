# Vibely Performance Baseline

Date: 2026-09-09

Environment (local / staging — not production)

| Item | Value |
|------|--------|
| CPU | |
| RAM | |
| PostgreSQL | 18.3 on localhost:5432 (`vibely`) |
| Redis (`app.redis.enabled`) | false (default local) |
| Spring Boot | `localhost:8080`, profile `dev` (`mvn spring-boot:run`) |
| k6 version | v2.2.0 (windows/amd64) |

## GET /api/feed/for-you?size=20

| VUs | p50 | p95 | p99 | RPS | http_req_failed | notes |
|-----|-----|-----|-----|-----|-----------------|-------|
| 10 | 181 ms | 346 ms | — | 19.5 | 0% | `feed.js` 30s, 592 req, all 200; max 909 ms; sleep 0.3s |
| 50 | 254 ms | 596 ms | 782 ms | 78.8 | 0% | 30s, 2406 req, all 200; max 1.29 s; CLI `--vus 50` overrides script |
| 100 | 779 ms | 1.5 s | 1.99 s | 84.0 | 0% | 30s, 2612 req, all 200; max 3.83 s; RPS almost flat vs 50 VU → knee |
| 250 | | | | | | not isolated — see ramp |
| 500 | | | | | | not isolated — see ramp |

Ramp `feed-ramp.js` (10→500 VU, 4m40s, sleep 0.2s) — **one blended summary**, not per-stage:

| | |
|--|--|
| requests | 18970, all 200, fail 0% |
| p50 / p95 / p99 | 1.03 s / **7.43 s** / **11.19 s** |
| avg / max | 2.21 s / 20.22 s |
| RPS (whole run) | 67.7 |
| peak VUs | 500 |

Local app stayed up (no errors) but **queued** at high VU. Discrete runs: **knee ~100 VU** on this laptop (RPS 79→84 while p95 596 ms→1.5 s). Redis off. Not production capacity. Skip isolated 250/500 — ramp already showed multi-second queues.

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
| Before | 346 ms @ 10 VU | 2026-09-09 local `feed.js` |
| After | | |
