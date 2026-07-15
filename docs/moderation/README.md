# Content Moderation

Canonical design: **[Intelligent Content Moderation TDD](../architecture/content-moderation/00-INDEX.md)**.

| File | Role |
|------|------|
| [PIPELINE.md](PIPELINE.md) | Pointer + Phase 1 ops notes |

## Code (Phase 1)

| Piece | Location |
|-------|----------|
| Flyway | `V67__content_moderation_phase1.sql` |
| Spring | `com.vibely.backend.moderation` |
| Internal API | `/api/internal/moderation/**` (`X-Internal-Token`) |
| Worker | `ai-workers/content-moderation` |
| Compose | `deploy/vps/docker-compose.content-moderation.yml` |
| Publication hold | With `APP_MODERATION_APPLY_DECISIONS=true`, new public posts stay `HIDDEN` until the moderation worker ALLOW/LIMIT |

**Shadow by default:** `APP_MODERATION_APPLY_DECISIONS=false` persists reports without mutating `videos.status` / Explore. Set `true` to apply LIMIT/REVIEW/BLOCK levers.

**Auto-ban:** with apply-decisions on, AI `BLOCK`/`DELETE` for labels `spam` / `sexual_content` / `violence` (and related evidence) bans the author (`APP_MODERATION_AUTO_BAN_ON_BLOCK=true`), removes their READY/HIDDEN posts, and hides the public profile.

## Phase 2 Admin

| Piece | Location |
|-------|----------|
| UI | `/admin/moderation` |
| API | `GET/POST /api/admin/moderation/**` (`ROLE_ADMIN`) |
| Human resolve | Always applies distribution levers (not shadow) |
