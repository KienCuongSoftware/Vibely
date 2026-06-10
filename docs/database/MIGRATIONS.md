# Flyway Migration Strategy

## 1. Overview

**Flyway** applies SQL migrations on startup. Java migration `V22__BackfillVideoPublicUuid` for data backfill.

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

After schema changes, update [SCHEMA.md](SCHEMA.md) and the [full ERD](../erd/vibely-erd-full.png) when table count or major relationships change.

## 4. Dev repair

`validate-on-migrate: false` in dev when checksum drift — run `mvn flyway:repair` then re-enable validate.

## 5–15.

Rollback: forward-fix only (new migration). CI: migrate against ephemeral PG container.
