# Search Architecture

## 1. Overview

Vibely has **two search surfaces**:

1. **Global search** (`backend/search`, `GET /api/search/*`) — TikTok-style suggest, entity search, trending keywords, per-user history.
2. **Explore search** (`GET /api/explore/search`) — cursor-paginated video results inside the explore bounded context (category/discovery grids).

This document focuses on (1). Explore pagination is documented in [explore/ARCHITECTURE.md](../explore/ARCHITECTURE.md).

## 2. Purpose

- **Intent-driven discovery** — find creators, hashtags, or videos by query string.
- **Low-latency suggest** — debounced autocomplete while typing.
- **Personalized history** — authenticated users persist recent queries (deduped on write).

## 3. Backend architecture

```
Client (debounced q)
  → GET /api/search/suggest?q=
  → SearchService.suggest()
       ├─ empty q → trendingItems(limit) only
       └─ non-empty → SearchSuggestionCacheService (Redis-style cache key)
            ├─ trendingMatching(q)   // keyword CONTAINS q, not full-site trending
            ├─ searchUsers(q)
            ├─ searchHashtags(q)
            └─ searchVideos(q)
  → SearchSuggestResponseDto { trending, users, hashtags, videos }
```

**Key classes**

| Class | Role |
|-------|------|
| `SearchController` | REST under `/api/search` |
| `SearchService` | Orchestration, history CRUD, trending |
| `SearchRankingService` | Relevance ordering for entity lists |
| `SearchTextNormalizer` | Trim/lowercase for cache keys and trend rows |
| `SearchSuggestionCacheService` | Short-lived suggest payload cache |
| `SearchTrendRepository` | `search_trends` aggregates + `findByKeywordContainingIgnoreCase…` |

**Security** (`SecurityConfig`): suggest/users/videos/hashtags/trending are public; history endpoints require JWT.

## 4. Suggest behavior (current)

| Input | Trending group in suggest |
|-------|---------------------------|
| Empty / whitespace | Top keywords by `search_count` (site trending) |
| Non-empty | Keywords where `keyword ILIKE %q%`, ordered by popularity — avoids unrelated global trends (e.g. `admin.vibely` when typing `kiencuong`) |

Users, hashtags, and videos in suggest are filtered by the same normalized query via dedicated repository queries.

## 5. Frontend architecture

```
SearchInput / WatchSearchDropdown
  → useSearch({ skipFetchWhenEmpty })   // no API call until user types (watch dropdown)
  → apiClient.getSearchSuggest(q)
  → useSearchNavigation.goToSearchResults(q)
  → navigate(/search?q=…)

SearchResultsPage
  → parallel getSearchUsers + getSearchVideos
  → tabs: Top (mixed), Users, Videos
  → POST /api/search/history on submit (when logged in)
```

**Utilities:** `frontend/src/components/search/searchUtils.js` (`normalizeSearchQuery`, `buildSearchResultsHref`, `suggestKeywordMatchesQuery`).

## 6. Data stores

| Store | Usage |
|-------|--------|
| PostgreSQL | Users, videos, hashtags, `search_trends`, `search_history` |
| Cache | Suggest response keyed by normalized query |

## 7. Scaling path

| Phase | Engine |
|-------|--------|
| Current | PostgreSQL ILIKE / dedicated projections + ranking service |
| Scale | OpenSearch / Elasticsearch for full-text and autocomplete |
| Trends | Stream ingest to `search_trends` (async) |

## 8. Operations

- Rate-limit suggest per IP (roadmap).
- Monitor: suggest p95, zero-result rate, cache hit ratio.
- Alert: spike in `DELETE /api/search/history` (unusual).

## 9. Tests

- `SearchServiceTest`, `SearchApiIntegrationTest`, `SearchEngineIntegrationTest` (backend)
- `searchUtils.test.js`, `useSearch.test.js` (frontend)
