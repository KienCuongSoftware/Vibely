# Discovery & Recommendation Architecture

## Overview

Vibely discovery is built around **topics as source of truth** and **Explore categories as presentation**.

Legacy `video_categories` continues to run in parallel during migration. New tables power semantic understanding, ranking, and personalization.

## Data model

| Table | Purpose |
|-------|---------|
| `topics` | Unlimited topic nodes (music, edm, valorant, …) |
| `topic_relations` | Hierarchical edges (music → edm) |
| `video_topics` | AI topic scores per video |
| `category_topic_map` | Topic → Explore category bridge |
| `video_category_scores` | AI category scores (multi-category) |
| `video_content_understanding` | Cached OpenAI / fallback JSON |
| `video_embeddings` | pgvector-ready JSON vectors |
| `video_engagement_stats` | engagement / explore / ranking scores |
| `user_topic_interests` | User interest graph |

## Write path (OpenAI cost control)

OpenAI is **only** invoked on:

- Video upload metadata sync
- Video metadata edit

Flow:

1. `VideoService.syncExploreSignals()` — legacy hashtags + `CategoryClassifierService` (unchanged)
2. `VideoDiscoveryIndexer` (async) — `ContentUnderstandingOrchestrator` → topics + category scores + embeddings + engagement recompute

If OpenAI fails or `OPENAI_API_KEY` is missing → **legacy classifier fallback** (upload never blocked).

## Read path (no OpenAI)

Feed, Explore, Search, Related, For You read **only PostgreSQL + Redis cache**:

- Hybrid Explore: union of `video_categories`, `video_category_scores`, `category_topic_map`
- Search: text + topic slug/name match + ranking
- Related: 70% embedding cosine + 30% topic overlap (precomputed vectors)
- For You: candidate generation from user interests + follow graph + engagement ranking

## Configuration

```yaml
app.discovery:
  open-ai-api-key: ${OPENAI_API_KEY:}
  ranking.watch-time: 0.35
  ranking.completion: 0.20
  # ...
```

Environment variables: `OPENAI_API_KEY`, `DISCOVERY_OPENAI_ENABLED`, `DISCOVERY_ENABLED`.

Local dev (`application-local.yaml`, gitignored):

```bash
OPENAI_API_KEY=sk-...
DISCOVERY_OPENAI_ENABLED=true
```

## API

- `GET /api/feed/for-you` — personalized feed (configurable ranking weights)
- Existing Explore endpoints unchanged; hybrid engine enabled when `app.discovery.hybrid-explore=true`

## Migration strategy

1. Deploy V31 + V32 migrations
2. New uploads indexed asynchronously into `video_topics`
3. Legacy `video_categories` remain until backfill job migrates historical videos
4. Disable hybrid flags to roll back read path without schema changes

## Future

- pgvector column on `video_embeddings`
- Transcript / OCR / audio metadata hooks (fields already accepted by understanding service)
- Dedicated ranking model service replacing weighted formula
