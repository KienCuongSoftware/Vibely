# Flyway Migration Strategy

## 1. Overview

**Flyway** applies SQL migrations on startup. Inspect `backend/src/main/resources/db/migration/` for the real set — version numbers may skip. Current tip: **V75**. Java migration `V22__BackfillVideoPublicUuid` handles video public UUID backfill.

## 2. Rules

- Never modify applied migration files in production
- Use `V{n}__description.sql` monotonic versioning
- Test migrations on staging snapshot before prod

## 3. History (summary)

| Version | Theme |
|---------|-------|
| V1–V9 | Baseline, auth, users |
| V10–V12 | Bookmarks, views, shares |
| V13–V16 | Audio, processing, dimensions |
| V17 | Comment threads |
| V18–V19 | Share system |
| V20–V22 | Onboarding, public UUID |
| V23–V24 | Explore |
| V25–V27 | Chat + requests + hide |
| V28 | Anti-bot platform |
| V29 | `otp_verification_codes.purpose` (REGISTER / PASSWORD_RESET) |
| V30 | Explore music / hashtag backfill |
| V31 | Discovery content graph |
| V32 | Discovery topic seed data |
| V33 | Explore topic ↔ category alignment |
| V34 | Topic canonical registry |
| V35 | Search foundation |
| V36 | Comment likes |
| V37 | User + system notifications |
| V38 | Aggregate video-like notifications (`actor_count`, `updated_at`, `user_notification_actors`) |
| V39 | Aggregate comment reply + comment like notifications per comment anchor |
| V40 | Aggregate follow notifications per recipient + mention notifications per video |
| V41 | Purge notifications for removed videos |
| V42 | Video reposts |
| V43 | User account status |
| V44 | User login history |
| V45–V60 | Private account/follows, videos studio draft/privacy, ban appeals, explore categories expand, originality |
| V61–V66 | Content Understanding schema, feature SHA, trending indexes, vocab expansion, Explore category precision |
| V67 | Intelligent Content Moderation Phase 1 (jobs, reports, policy/rules, decisions, review queue stubs) |
| V68 | Content Moderation Phase 3 appeals (`moderation_appeals`) |
| V69 | Content Moderation Phase 4 detector plugins (`detector_registry` + plugin_score rules) |
| V70 | Moderation auto-ban: spam/nsfw/violence rules → BLOCK |
| V71 | Expand lex.spam caption patterns (follow of/for nudes, …) |
| V72 | `lex.sexual_vi` — Vietnamese sexual / vulgar caption lexicon → BLOCK |
| V73 | `lex.violence_vi` — Vietnamese / EN violence threat lexicon → BLOCK |
| V74 | Bulk expand sexual/vulgar + violence lexicons (VI/EN) → BLOCK |
| V75 | CU CLIP NSFW/violence visual tags + lower plugin BLOCK thresholds (0.42) |

After schema changes, update [SCHEMA.md](SCHEMA.md) and the [full ERD](../erd/vibely-erd-full.png) when table count or major relationships change.

## 4. Dev repair

`validate-on-migrate: false` in dev when checksum drift — run `mvn flyway:repair` then re-enable validate.

## 5–15.

Rollback: forward-fix only (new migration). CI: migrate against ephemeral PG container.
