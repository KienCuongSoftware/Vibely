# Vibely AI Enhancement Service
## Technical Design Document — Index

| Field | Value |
|-------|--------|
| Document ID | VIBELY-TDD-AI-ENHANCE-2026-08 |
| Version | 1.2 |
| Status | **Production-ready path** — rule eval, lease recovery, AI playback preference, optional Real-ESRGAN; default engine still noop-ffmpeg until GPU binary installed |
| Audience | Engineering, AI/ML, SRE, Product |
| Related | [PIPELINE.md](../../media/PIPELINE.md), [CDN_AND_MEDIA.md](../CDN_AND_MEDIA.md), overall plan in Cursor plans |

---

## Document map

| Part | File | Scope |
|------|------|--------|
| 1 | [01-SERVICE-ARCHITECTURE.md](./01-SERVICE-ARCHITECTURE.md) | Independent service boundaries, package layout, Clean Architecture, K8s scale |
| 2 | [02-PIPELINE-AND-ENGINES.md](./02-PIPELINE-AND-ENGINES.md) | Step pipeline, frame vs clip strategy, metadata, validation rules, levels, Strategy engines |
| 3 | [03-OPS-RETRY-METRICS.md](./03-OPS-RETRY-METRICS.md) | Resource Manager, Workspace, Retry, Error taxonomy, Logging, Metrics, Cleanup |
| 4 | [04-GPU-WORKER.md](./04-GPU-WORKER.md) | Event-driven GPU Worker: discovery, scheduler, frame/tile/batch, checkpoint, progress, security |
| 5 | [05-PRODUCTION.md](./05-PRODUCTION.md) | Production env, deploy, rules, Real-ESRGAN, smoke tests |

---

## Non-negotiable design laws

1. **Do not modify** Upload Service or existing FFmpeg HLS Worker (`FfmpegHlsPipelineRunner` / `video_processing_jobs`).
2. **AI Enhancement is an independent deployable** (own process / container / Helm chart). Spring Boot API only enqueues jobs and reads versions.
3. **Business never imports a concrete AI model.** Only `EnhancementEngine` port + factory/strategy.
4. **Horizontal scale:** workers are stateless w.r.t. shared FS; workspace is local ephemeral; state lives in Postgres + S3 + RabbitMQ.
5. **Output is always labeled AI Enhanced** — never marketed as native 4K.
6. **No overwrite** of standard HLS; write under `enhanced/{profile}/`.
7. **GPU Worker** consumes **queue only** (no Upload Service / REST dependency for processing).

---

## Reading order

1. This index  
2. Part 1 — service & packages  
3. Part 2 — pipeline & models  
4. Part 3 — ops (resources, retry, metrics)  
5. Part 4 — GPU Worker runtime  
6. Part 5 — production runbook  
7. Parent system overview (upload + eligibility) remains in the architecture plan / media docs  

---

## Implementation map (MVP)

| Layer | Location |
|-------|----------|
| Flyway | `backend/.../db/migration/V89__ai_enhancement.sql` |
| Spring module | `backend/.../enhancement/` |
| Worker | `ai-workers/ai-enhance/` |
| Compose | `deploy/vps/docker-compose.ai-enhance.yml` |

Admin: `POST /api/admin/enhancement/enqueue`  
Worker internal: `/api/internal/enhancement/**`  
Public versions: `GET /api/videos/{id}/versions`

---

## Compatibility with current Vibely

| Existing | Interaction |
|----------|-------------|
| `videos` + `video_url` | Read-only input (original) |
| `video_processing_jobs` + FFmpeg worker | Untouched; AI starts only after video READY |
| RabbitMQ | New queues `ai.enhance.*` |
| PostgreSQL | `enhancement_jobs`, `video_versions`, `enhancement_rules` |
| S3 | `uploads/` read; `hls/.../enhanced/` write; `tmp/enhance/` staging |
| Redis | Lease/locks + metric cache for rules (evaluator outside this service) |
