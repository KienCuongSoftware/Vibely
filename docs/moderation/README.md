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

**Shadow by default:** `APP_MODERATION_APPLY_DECISIONS=false` persists reports without mutating `videos.status` / Explore. Set `true` to apply LIMIT/REVIEW/BLOCK levers.
