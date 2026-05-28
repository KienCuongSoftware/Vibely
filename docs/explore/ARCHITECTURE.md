# Explore Architecture

## 1. Overview

Explore surfaces **categories**, **trending**, **search**, and **related videos** with Redis-backed page caching.

## 2. Purpose

Discovery beyond the algorithmic For You feed.

## 3. Architecture

```
GET /api/explore/categories
GET /api/explore/trending
GET /api/explore/category/{slug}
GET /api/explore/search?q=
GET /api/explore/video/{publicId}/related
```

Schema: V23 `explore_schema`, V24 backfill. Classifier assigns videos to categories.

## 4. System Design

- **Cache key:** `{redisPrefix}:explore:{key}` TTL `app.explore.cache-ttl-seconds`
- **Ranking:** explore-specific scoring service
- **Frontend:** `ExplorePage`, `ExploreViewerPage`

## 5–7.

Search: PostgreSQL full-text / ILIKE (verify implementation in ExploreService). Scale: Elasticsearch migration path documented as future.

## 8–15.

Invalidate cache on trending refresh job. Security: sanitize query params. Monitor: cache hit ratio, search latency.
