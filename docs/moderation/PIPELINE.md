# Moderation Pipeline

**Superseded.** The aspirational “AI pre-filter on upload frames / strikes / queues” sketch that lived here is replaced by the production TDD:

→ **[docs/architecture/content-moderation/00-INDEX.md](../architecture/content-moderation/00-INDEX.md)**

Especially:

- [01 — Vision & Platform](../architecture/content-moderation/01-VISION-AND-PLATFORM.md) — ALLOW / LIMIT / REVIEW / BLOCK / DELETE + distribution
- [02 — Pipeline & Policy Engine](../architecture/content-moderation/02-PIPELINE-AND-POLICY-ENGINE.md) — events, risk, no re-infer
- [03 — Data / API / Dashboard](../architecture/content-moderation/03-DATA-API-DASHBOARD.md) — schema, REST, RabbitMQ
- [04 — HITL & Learning](../architecture/content-moderation/04-HITL-AND-LEARNING.md) — review, appeal, Phase 4–5+

## Current thin behavior (until Phase 1 lands)

```
POST /api/videos/{id}/report
  → videos.report_* + status REPORTED
  → no automated Policy Engine yet
```

Admin/author takedown → `REMOVED`. Phase 1 Policy Engine + joins: see TDD. Default **shadow** until `APP_MODERATION_APPLY_DECISIONS=true`.
