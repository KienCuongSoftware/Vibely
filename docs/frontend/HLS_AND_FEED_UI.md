# HLS Integration & Feed UI

## 1. Overview

Playback uses **hls.js** for `.m3u8` streams with progressive MP4 fallback via `features/feed/utils/feedPlayback.js`.

## 2. Purpose

Adaptive bitrate for variable mobile networks.

## 3. Architecture

| Piece | Path |
|-------|------|
| Player | `features/feed/components/FeedVideoPlayer.jsx` |
| Stage / shells | `FeedPhoneStage`, `MobileFeedShell`, `VirtualizedFeed`, `VerticalVideoFeed` |
| URL resolve | `features/feed/utils/feedPlayback.js` — `resolveFeedPlaybackUrl` / `isHlsPlaybackUrl` |
| Prefetch | `features/feed/algorithms/FeedPrefetchManager.js` + `useFeedPrefetch` |
| Tuning | `features/feed/utils/feedConfig.js` |
| Quality / speed | `hlsQualityUtils`, persisted quality/speed hooks under `features/feed/` |

## 4–6.

Infinite scroll: cursor from API stored in ref; append on end reached. Virtualization limits DOM nodes. Media window radius from `FEED_CONFIG` controls how many HLS instances stay alive.

## 7–15.

Performance: destroy HLS instance on unmount / leave window. Security: only HTTPS URLs from API. Monitoring: playback start time, stall ratio (roadmap).
