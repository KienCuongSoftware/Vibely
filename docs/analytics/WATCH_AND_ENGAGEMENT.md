# Watch & Engagement Analytics

## 1. Overview

`video_views` stores view events; V15 adds `playback_ms` for watch-time quality.

## 2. Purpose

Feed ranking signals and creator studio metrics.

## 3. Data flow

```
Client heartbeat / end of view
  → POST /api/videos/{id}/views
  → aggregate counters on videos
  → studio analytics queries
```

## 4. Metrics

- Views, unique viewers (roadmap)
- Average watch time
- Completion rate
- Share/like rates from interaction tables

## 5–15.

Batch: nightly rollups to OLAP (BigQuery/Snowflake roadmap). Privacy: aggregate only in studio UI. Monitor: event ingestion lag.
