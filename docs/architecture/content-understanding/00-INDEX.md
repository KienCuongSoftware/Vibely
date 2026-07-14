# Vibely Content Understanding System
## Technical Design Document — Index

| Field | Value |
|-------|--------|
| Document ID | VIBELY-TDD-CUS-2026-07 |
| Version | 1.0 |
| Status | Proposed — Production-oriented |
| Audience | Engineering, AI/ML, SRE, Product, Moderation |
| Related | Explore (`docs/explore`), Discovery (`docs/discovery`), Originality (`Vibely-Originality-Detection-TDD.md`), Event-driven (`EVENT_DRIVEN_ARCHITECTURE.md`) |

---

## Document map

| Part | File | Scope |
|------|------|--------|
| 1 | [01-VISION-AND-PRINCIPLES.md](./01-VISION-AND-PRINCIPLES.md) | Problem, philosophy, Semantic Tag as source of truth, multi-consumer goals |
| 2 | [02-AI-PIPELINE.md](./02-AI-PIPELINE.md) | Microservice pipeline, frame/OCR/ASR/vision/fusion/tags/topics/categories, Mermaid |
| 3 | [03-DATA-WORKERS-API.md](./03-DATA-WORKERS-API.md) | PostgreSQL schema, Qdrant, RabbitMQ, workers, REST, Docker Compose, phases |
| 4 | [04-MLOPS-LIFECYCLE.md](./04-MLOPS-LIFECYCLE.md) | Model registry, feedback, drift, A/B, GPU, monitoring, 3-year roadmap |
| 5 | [05-KNOWLEDGE-GRAPH.md](./05-KNOWLEDGE-GRAPH.md) | Knowledge graph, semantic search, related/rec/trending consumers, 5-year roadmap |

---

## Current Vibely baseline (must not ignore)

| Capability | Today | Gap vs CUS target |
|------------|-------|-------------------|
| Explore categories | Rule-based `CategoryClassifierService` + optional OpenAI metadata understanding | No true multi-modal video understanding |
| Discovery | `video_topics`, `video_category_scores`, `video_content_understanding`, embeddings | Mostly text/OpenAI; not frame+OCR+ASR fusion pipeline |
| Originality worker | Python + frames + OCR + Qdrant (`ai-workers/originality`) | Different product goal; **reuse frame/OCR/download patterns** |
| Messaging | Postgres job poll for HLS; Kafka optional for anti-bot | **Need RabbitMQ (or Kafka) for CU pipeline** |
| Qdrant | Used by originality | Reuse for CU embeddings collections |

**Migration rule:** CUS **replaces** “category-first” thinking. Explore becomes a **consumer** of Semantic Tags → Category Engine mapping. Legacy `video_categories` stays readable until backfill completes.

---

## Non-negotiable design laws

1. **Semantic Tag is source of truth.** Category / Explore chip = presentation mapping only.
2. **Spring Boot never runs heavy AI inference.** Publish events; persist results; authz; APIs.
3. **Python workers own the AI pipeline.** Horizontal scale, GPU/CPU separation.
4. **Async only on upload path.** HTTP create/update must not wait for understanding.
5. **Every tag has confidence + source + reason** (explainable).
6. **One analysis, many consumers** (Explore, Rec, Search, Moderation, Ads).
7. **Model/version/config never hardcoded** in consumer code — Model Registry.
8. **Phased delivery** — ship value without boiling the ocean.

---

## Recommended first production slice (Phase 1–2)

See Part 3 § Phases. Minimum lovable CUS:

1. RabbitMQ + `content-understanding` worker skeleton  
2. Frame sampling + PaddleOCR + Whisper-small + OpenCLIP  
3. Fusion → Semantic Tags + Category Engine mapping  
4. Persist Postgres + Qdrant video vectors  
5. Wire Explore hybrid + Related/Search to tags  

Keep rule-based classifier as **cold fallback** when worker unavailable (parity with today’s OpenAI fallback).

---

## Implementation status (repo)

**Phase 1 landed (code):**

| Piece | Location |
|-------|----------|
| Flyway | `backend/.../V61__content_understanding_phase1.sql` |
| Spring module | `com.vibely.backend.contentunderstanding` |
| Enqueue | `VideoCommandService` (publish / non-draft create / metadata update) |
| Internal API | `/api/internal/content-understanding/**` |
| Outbox → RabbitMQ | when `APP_CU_RABBITMQ_ENABLED=true` |
| Worker | `ai-workers/content-understanding` (metadata lexicon + poll/Rabbit) |
| Compose | `deploy/vps/docker-compose.content-understanding.yml` |

**Not yet:** real OCR/CLIP/Whisper, Qdrant CU collections, public REST analysis APIs, Explore UI consuming tags first.
