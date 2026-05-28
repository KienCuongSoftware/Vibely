# HLS Integration & Feed UI

## 1. Overview

Playback uses **hls.js** for `.m3u8` streams with progressive MP4 fallback via `feedPlayback.js`.

## 2. Purpose

Adaptive bitrate for variable mobile networks.

## 3. Architecture

- `FeedVideoPlayer.jsx` — attaches MediaSource, handles fatal errors
- `feedPlayback.resolvePlaybackUrl(video)` — master vs mp4
- `FeedPrefetchManager` — prefetch manifest on upcoming index

## 4–6.

Infinite scroll: cursor from API stored in ref; append on end reached. Virtualization limits DOM nodes.

## 7–15.

Performance: destroy HLS instance on unmount. Security: only HTTPS URLs from API. Monitoring: playback start time, stall ratio.
