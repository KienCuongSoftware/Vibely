# Part 4 — HITL & Learning Roadmap

| Field | Value |
|-------|--------|
| Parent | [00-INDEX.md](./00-INDEX.md) |
| Status | Proposed |
| Note | Phase 1–3 = product safety loop; Phase 4–5+ = sketched only — no invented MLOps fleet |

---

## 1. Human-in-the-loop (HITL)

### 1.1 When humans enter the path

| Trigger | Queue behavior |
|---------|----------------|
| Decision `REVIEW` | Always enqueue `moderation_review_queue` |
| Decision `BLOCK` / `DELETE` (optional ops flag) | Shadow queue for audit sample |
| User reports on ACTIVE video | Boost priority or open REVIEW even if AI ALLOW |
| Soft-timeout evaluate (`originality_pending`) mid-band risk | Prefer REVIEW |
| Moderator SLA breach | Escalation notify (Phase 2+) |

### 1.2 Claim & resolve

1. Moderator opens Admin queue → `claim` (optimistic lock / claimed_by + TTL).
2. Detail page shows evidence + CU tags + originality explain (deep links).
3. Resolve:
   - **Confirm** — keep AI decision; mark APPLIED / close queue.
   - **Override** — new effective decision + mandatory reason code + free text → write `moderator_actions` + `moderation_audit_logs` + update `moderation_decisions` + emit `moderation.human.overridden`.
4. Release claim on timeout so items are not stuck.

### 1.3 Dual control (optional Phase 3)

High-severity DELETE may require second moderator confirmation for non-admin roles.

---

## 2. Appeal (Phase 3)

| Step | Behavior |
|------|----------|
| Author sees limited status | “Limited reach” / “Under review” / “Removed” without internal rule dump |
| `POST .../moderation-appeals` | Creates appeal linked to `moderation_decisions` / report |
| Queue | Appeals enter review with `source=APPEAL` priority |
| Outcome | Uphold / soften (e.g. BLOCK→LIMIT) / restore ALLOW; audit + trust adjustment |

Appeals never auto-ALLOW without human in Phase 3.

---

## 3. Creator Trust (Phase 3)

Inputs to rolling score (direction only):

| Signal | Effect |
|--------|--------|
| Sustained ALLOW without reports | Trust ↑ |
| Human confirms AI BLOCK correctly | Mild ↑ (good citizen after cleanup) or neutral |
| Overturned false BLOCK | Trust ↓ for rule quality path; creator may ↑ slightly |
| Repeated hard violations | Trust ↓↓; may force REVIEW band widening |
| Successful appeal of mistaken LIMIT | Trust slight ↑ |

Hard overrides (**child-safety**, terrorism lexicons) **ignore** high trust.

---

## 4. Feedback tables (learning substrate)

Capture disagreement without shipping a training platform on day one:

| Artifact | Use |
|----------|------|
| `moderator_actions` before/after decision | Primary label for active learning |
| `moderation_audit_logs` | Compliance + debugging |
| Optional `moderation_feedback_labels` (Phase 5) | Explicit “rule X false positive” tags for ops |

Export path: SQL / CSV to offline notebooks — **not** an in-repo Kubeflow story.

---

## 5. Phase 4 — Detector plugins (no re-infer pipeline)

Goal: improve sexual / violence / gore recall using **stored** CU signals.

| Allowed | Forbidden |
|---------|-----------|
| Read `content_features.visual` / object JSON / frame embedding refs from Qdrant `vibely_cu_*` | Re-download MP4 for Whisper/OCR/CLIP encode as part of “moderation analyze” |
| Run small classification head in moderation worker or sidecar | Fork full CU pipeline inside moderation |
| Persist plugin scores as evidence rows `source_modality=PLUGIN` | Silent decisions without evidence |

Plugin results feed the **same** Policy Engine as lexicon rules (extra firings).

Model binaries: versioned artifacts referenced by `policy_versions` or a thin `detector_registry` table (Phase 5 may rename to model registry). Phase 4 ships 0–1 plugins max if ops-ready; TDD only requires the extension point.

---

## 6. Phase 5+ — Active learning, drift, A/B (sketch only)

Do **not** treat this section as committed roadmap for current VPS staffing.

| Idea | Intent | Vibely constraint |
|------|--------|-------------------|
| Active learning thresholds | Sample uncertain band (confidence 0.4–0.7) into REVIEW even if risk says LIMIT | Uses existing queue |
| Model / detector registry | Track plugin artifact digest + champion/challenger | Optional table; no inventing multi-cluster serving |
| Drift monitors | Rate of label firings / override rate week-over-week | Metrics + alerts, not Neo4j |
| A/B policy versions | Shadow evaluate policy B; compare override rates | Outbox can fan dual jobs; apply only champion |
| Calibration | Replace naive confidence product | Offline fit from HITL |

**Explicit non-goals:** building a second “moderation training cluster,” duplicating CU MLOps docs that were removed, or blocking Phase 1 on any of the above.

---

## 7. Privacy, retention, GDPR

| Topic | Stance |
|-------|--------|
| Evidence snippets | May contain PII from OCR/speech — retain with video retention / user delete cascade |
| Audit logs | Longer retention than public video if legally required — configure TTL |
| Export | Include moderation decisions in account export when implemented |
| Delete user | Cascade or anonymize moderator ids per security policy |

---

## 8. Rollout safety

| Guard | Detail |
|-------|--------|
| Feature flag | `vibely.moderation.enabled` — off = no evaluate enqueue |
| Shadow mode | Evaluate + persist report **without** applying HIDDEN/REMOVED (Phase 1 dogfood) |
| Gradual apply | Enable DecisionApplier for new uploads only |
| Kill switch | Disable worker + leave Admin override path |

---

## 9. Phase checklist (ops)

| Phase | Done when |
|-------|-----------|
| **1** | Schema + events + worker + persist + optional shadow/apply for LIMIT/REVIEW/BLOCK |
| **2** | Admin queue claim/resolve usable daily by Trust & Safety |
| **3** | Trust + appeal + audit completeness |
| **4** | ≥1 plugin optional; evidence visible in Admin |
| **5+** | Metrics-driven rule/policy iteration; optional A/B |

---

## Related

- Vision: [01-VISION-AND-PLATFORM.md](./01-VISION-AND-PLATFORM.md)
- Engine: [02-PIPELINE-AND-POLICY-ENGINE.md](./02-PIPELINE-AND-POLICY-ENGINE.md)
- Data/API: [03-DATA-API-DASHBOARD.md](./03-DATA-API-DASHBOARD.md)
- CU consumer law: [content-understanding/00-INDEX.md](../content-understanding/00-INDEX.md)
