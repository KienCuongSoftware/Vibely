# Media Processing Pipeline

## 1. Overview

Videos upload to S3 raw; **FFmpeg** transcodes to multi-bitrate **HLS**; status transitions on `videos` entity.

## 2. Purpose

Universal playback on web/mobile browsers via hls.js / native HLS.

## 3. Architecture

```mermaid
flowchart LR
  A[Presign PUT] --> B[S3 raw]
  B --> C[ProcessingJob]
  C --> D[FfmpegHlsPipelineRunner]
  D --> E[S3 hls/ playlist + segments]
  E --> F[Video READY]
```

## 4. System Design

- `app.processing.worker.enabled` — toggle worker
- `FfmpegHlsPipelineRunner` — download, transcode, upload, cleanup temp
- Audio pipeline: `processing/audio/*` + optional Lambda (`infra/lambda-audio-extract`)
- Thumbnails: separate presign `presign-thumbnail`

## 5. Data Flow

`VideoProcessingStatus`: PENDING → PROCESSING → READY | FAILED.

## 6. FFmpeg diagram

```
input.mp4
  → scale 360p/720p variants
  → hls_time segment
  → master.m3u8 + variant playlists + .ts files
```

## 7. Scaling

- Dedicated worker ASG with GPU (optional)
- Queue depth metrics, autoscale on lag

## 8. Performance

- Segment duration tuning for startup vs efficiency
- Two-pass encoding (roadmap for quality)

## 9. Security

- Sandboxed FFmpeg in container
- Validate MIME on presign

## 10–15.

Failures: corrupt file → FAILED + user notification. Recovery: manual requeue. Monitoring: job duration, failure rate.
