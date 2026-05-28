# Ranking & Personalization

## 1. Overview

Ranking combines **recency**, **engagement** (likes, views, shares), and explore classifier outputs. Full ML personalization is roadmap; hooks exist in schema and analytics.

## 2. Purpose

Surface relevant content without cold-start starvation.

## 3. Architecture

```
Candidate generation (SQL filters)
  → Scoring function (weights in SQL or service)
  → Keyset order
  → Optional: boost fresh / diverse creators
```

## 4. System Design

**Signals today:**

- `video_views.playback_ms` (V15) — watch-time proxy
- Like/comment counts from interaction tables
- Share count (V12, Redis mirror)

**Personalization hooks:**

- Following feed: join `follows`
- Future: user embedding dot product in `recommendation/`

## 5–7.

Watch-time weighted score: `score = f(views, completion_rate, recency_decay)`.

Scaling: offline Spark job → `video_rank_features` table (roadmap).

## 8–15.

Tradeoff: explainable SQL vs black-box model. Monitor: CTR, average watch time, skip rate.
