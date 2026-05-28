# Optimization Guide

## Frontend

- Virtualize feed (`VerticalVideoFeed`)
- Prefetch HLS manifests (`FeedPrefetchManager`)
- Lazy routes, code splitting
- Debounce explore search
- Destroy hls.js instances on unmount

## Backend

- Keyset pagination everywhere
- `open-in-view: false`
- Redis explore cache
- Batch author resolution in feeds
- Async telemetry publish (roadmap)

## Database

- Index `(created_at, id)` on videos
- Avoid SELECT *
- Read replicas for feed

## Redis

- TTL on all keys
- Monitor memory pressure

## HLS

- 2–4s segments for startup
- Limit variant count on mobile

## 10–15.

Load test with k6 (see testing/). Profile FFmpeg worker separately from API JVM.
