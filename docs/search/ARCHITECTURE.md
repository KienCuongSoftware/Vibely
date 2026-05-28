# Search Architecture

## 1. Overview

Search is implemented within the **explore** bounded context: hashtag, creator, and video text matching.

## 2. Purpose

Intent-driven discovery (known creator / topic).

## 3. Architecture

```
Client debounced input
  → GET /api/explore/search?q=&type=
  → ExploreService search method
  → PostgreSQL query + ranking
  → ExplorePageDto
```

## 4. Target indexing

| Phase | Engine |
|-------|--------|
| MVP | PostgreSQL GIN / trigram |
| Scale | OpenSearch / Elasticsearch |
| Creator | Dedicated user index |

## 5–15.

Autocomplete: prefix index on usernames. Security: query length limits, rate limit. Performance: cache popular queries. Failure: empty results UX. Monitor: zero-result rate.
