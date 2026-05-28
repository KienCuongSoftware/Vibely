# Service Boundaries & Microservice Readiness

## 1. Overview

Packages under `com.vibely.backend.*` define domain boundaries within a single deployable JAR. Each boundary has a documented extraction path to a standalone service.

## 2. Purpose

Enable team ownership and independent scaling without premature microservice fragmentation.

## 3. Architecture

| Package | Bounded context | Extract priority |
|---------|-----------------|------------------|
| `video` + `feed` | Playback & catalog | Medium |
| `processing` | Media transcode | **High** (CPU-bound) |
| `auth` | Identity | Medium |
| `antibot` | Security platform | High |
| `chat` | Messaging | High (WebSocket sticky) |
| `explore` | Discovery | Medium |
| `interaction` | Social graph | Low (co-locate with video) |
| `share` | Growth / links | Low |
| `storage` | S3 presign | Co-locate with API or media |
| `studio` | Creator analytics | Low |

## 4. System Design

**Integration rules today:**

- Controllers call services in same module or adjacent modules via Spring DI
- No circular dependencies: `antibot` → `auth` hook, not reverse
- Shared `common` for ApiResponse, exceptions only

**Extraction interface pattern:**

```
api-gateway → video-service (REST)
           → media-worker (queue)
           → chat-service (WS)
```

## 5. Data Flow

Each service would own its PostgreSQL schema namespace; today single database with table prefixes per domain.

## 6. Sequence Flows

Media extraction:

```
VideoController → VideoService → ProcessingJobEnqueue
→ FfmpegHlsPipelineRunner (future: SQS message)
```

## 7. Scaling Strategy

- First split: `processing` worker + `antibot` sidecar or service
- Chat: dedicated WS nodes with Redis pub/sub bridge

## 8–15. (Summary)

- **Performance:** Isolate FFmpeg from API JVM
- **Security:** Anti-bot as mandatory gateway plugin
- **Failures:** Blast radius reduced per extraction
- **Tradeoff:** Operational cost vs isolation
- **Monitoring:** Per-service SLOs after split
- **Future:** BFF for mobile, gRPC internal

See [backend/MODULE_STRUCTURE.md](../backend/MODULE_STRUCTURE.md).
