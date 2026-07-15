# Vibely Content Understanding System
## Technical Design Document — Index

| Field | Value |
|-------|--------|
| Document ID | VIBELY-TDD-CUS-2026-07 |
| Version | 1.1 |
| Status | **Shipped** — Phase 1–5 in production |
| Audience | Engineering, AI/ML, SRE, Product, Moderation |
| Related | Explore (`docs/explore`), Discovery (`docs/discovery`), Originality (`Vibely-Originality-Detection-TDD.md`), Moderation consumer ([content-moderation/00-INDEX.md](../content-moderation/00-INDEX.md)) |

---

## Document map

| Part | File | Scope |
|------|------|--------|
| 1 | [01-VISION-AND-PRINCIPLES.md](./01-VISION-AND-PRINCIPLES.md) | Problem, philosophy, Semantic Tag as source of truth |
| 2 | [02-AI-PIPELINE.md](./02-AI-PIPELINE.md) | Pipeline: frame/OCR/ASR/vision/fusion/tags/topics/categories |
| 3 | [03-DATA-WORKERS-API.md](./03-DATA-WORKERS-API.md) | Schema, Qdrant, RabbitMQ, workers, REST, Compose, phases |

Long-horizon MLOps / Neo4j knowledge-graph design was removed from the tree (not implemented). Keep ideas in issue trackers if needed.

---

## Non-negotiable design laws

1. **Semantic Tag is source of truth.** Category / Explore chip = presentation mapping only.
2. **Spring Boot never runs heavy AI inference.** Publish events; persist results; authz; APIs.
3. **Python workers own the AI pipeline.** Horizontal scale, GPU/CPU separation.
4. **Async only on upload path.** HTTP create/update must not wait for understanding.
5. **Every tag has confidence + source + reason** (explainable).
6. **One analysis, many consumers** (Explore, Rec, Search, Moderation). Moderation must **not** re-run OCR/Whisper/CLIP — see [Intelligent Content Moderation TDD](../content-moderation/00-INDEX.md).
7. **Phased delivery** — ship value without boiling the ocean.

---

## Implementation status (repo)

| Phase | Status | Notes |
|-------|--------|-------|
| **1** | Landed | Flyway V61, Spring `contentunderstanding`, RabbitMQ outbox, worker poll/Rabbit, RapidOCR |
| **2** | Landed | OpenCLIP, Whisper, YOLO lite, late fusion, Qdrant `vibely_cu_*` |
| **3** | Landed | Topic/category projection; Admin CU APIs (no dedicated Admin CU page) |
| **4** | Landed | Related hybrid, public explainable REST, search/For-You CU affinity, Admin post CU panel |
| **5** | Landed | `GET /api/explore/trending-tags`, Studio auto-hashtag, `/api/search/semantic`, studio `topSemanticTags` |
| **Vocab** | Landed | ~347 tags + aliases (`V64`, `vocab_catalog.py`); closed vocabulary |
| **Explore precision** | Landed | Explore category tabs use **strong** `video_categories` only (`score ≥ 1.5`); classifier persist ≥ 2.0; Flyway V65–V66 purge weak links |

**UI note:** Explore **no longer shows** a second row of trending-tag chips (API remains for other clients).

**Not yet:** Neo4j/`knowledge_edges`, learned fusion MLP, open-vocabulary LLM tagging.

### Key paths

| Piece | Location |
|-------|----------|
| Flyway | `V61`…`V66` CU-related migrations |
| Spring | `com.vibely.backend.contentunderstanding` |
| Worker | `ai-workers/content-understanding` |
| Compose | `deploy/vps/docker-compose.content-understanding.yml` |
| Vocab codegen | `ai-workers/content-understanding/scripts/build_vocab.py` |
