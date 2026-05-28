# Persistence & Transactions

## 1. Overview

PostgreSQL is the system of record. **Flyway** manages schema (V1–V28 SQL + Java V22). Hibernate validates schema (`ddl-auto: validate`).

## 2. Purpose

ACID guarantees for social graph, chat, and video metadata.

## 3. Architecture

- Spring Data JPA repositories
- `@Transactional` on service layer (read-only for queries)
- JSONB columns for anti-bot signals (`anti_bot_*` tables)

## 4. System Design

**Migration policy:**

- Never edit applied migrations in prod — add new `V{n}__`
- Dev may use `validate-on-migrate: false` during repair

**UUID strategy:**

- Public video IDs: `video.public_uuid` (V21, V22 backfill)
- Internal BIGINT PKs for joins

## 5. Data Flow

Write path: service → entity → flush → commit. Chat messages + conversation updates in single transaction where needed.

## 6–7. Scaling

- Read replicas for feed/explore
- Connection pool per service after split
- Partitioning `video_views` by month (roadmap)

## 8. Performance

Indexes on foreign keys, `(created_at, id)` for keyset, explore materialized paths (V23/V24).

## 9–15.

See [database/SCHEMA.md](../database/SCHEMA.md). Failures: deadlock retry, migration rollback via forward fix.
