# Part 1 — Vision & Platform

| Field | Value |
|-------|--------|
| Parent | [00-INDEX.md](./00-INDEX.md) |
| Status | Proposed |

---

## 1. Problem

Vibely already computes **what a video is about** (Content Understanding) and **whether it is derivative** (Originality). What it does **not** yet do is a unified, explainable **policy decision** that:

- Maps multi-signal evidence → ALLOW / LIMIT / REVIEW / BLOCK / DELETE
- Applies consistent **distribution levers** (Explore / For-You / publish readiness)
- Gives humans a review queue with full evidence
- Audits every automated and human action

Today’s surface is thin: users report → `REPORTED`; author/admin can set `REMOVED`. Status `HIDDEN` exists on `VideoStatus` but is unused. Originality decisions sit in `originality_reports` without gating Explore. CU features are unused by any safety consumer.

Inventing a second OCR / Whisper / CLIP fleet for “moderation” would duplicate cost, drift from CU truth, and violate CU law 6 (*one analysis, many consumers*).

---

## 2. Platform vs model (core thesis)

| Role | Owns |
|------|------|
| **Content Understanding** | Frames, OCR, ASR, vision, fusion → tags / topics / categories / `content_features` |
| **Originality** | Similarity scores → `ALLOW` / `REVIEW` / `LIMIT_DISTRIBUTION` / `BLOCK` + matches |
| **Content Moderation (this system)** | **Policy consumer**: load feature snapshot → evaluate rules → risk / decision / explain → Spring applies levers |

Moderation may later host **optional detector plugins** (Phase 4+) that read **already-stored** embeddings / object JSON from CU. Plugins never download the MP4 for OCR/ASR and never re-run the CU pipeline.

---

## 3. Design laws (restated)

1. Moderation is a **platform / policy consumer**, not a second model pipeline.
2. **Forbidden** on the moderation hot path: OCR, Whisper, CLIP encode, YOLO, scene extract, full video re-download for re-analysis.
3. Spring: orchestration, persistence, authz, distribution — **no hardcoded policy**.
4. Python worker owns Policy Engine evaluation.
5. Every decision: risk + confidence + evidence + policy_version + audit.
6. Ship Phase 1 on current VPS (Postgres + Redis + RabbitMQ).

---

## 4. Decision taxonomy

Canonical platform decisions (effective outcome after policy + optional human override):

| Decision | Meaning | Typical trigger class |
|----------|---------|------------------------|
| **ALLOW** | Safe to distribute under normal rules | Low risk, no hard overrides |
| **LIMIT** | Published / playable but restricted reach | Soft policy hits, originality limit, borderline NSFW language |
| **REVIEW** | Hold wide distribution; enqueue human | Medium–high risk, conflicting signals, originality REVIEW |
| **BLOCK** | Do not publish widely / remove from discovery; may reject first publish | Hard policy, high-confidence harm, originality BLOCK |
| **DELETE** | Post-publish takedown (admin or high-severity AI) → `REMOVED` | Confirmed CSAM/terror/scam, repeated strikes, moderator delete |

**Mapping from originality inputs** (not identity — policy may escalate or soften):

| Originality `decision` | Default policy stance (v1) |
|------------------------|----------------------------|
| `ALLOW` | Neutral input |
| `REVIEW` | Bias toward platform `REVIEW` |
| `LIMIT_DISTRIBUTION` | Bias toward platform `LIMIT` |
| `BLOCK` | Bias toward platform `BLOCK` (hard override eligible if confidence high) |

---

## 5. Distribution matrix

Integration with **existing** video / feed levers. Prefer extending current semantics over inventing parallel shadow flags unless documented.

| Decision | `videos.status` (or flag) | Explore / For-You / Trending | Studio / first publish |
|----------|---------------------------|------------------------------|------------------------|
| **ALLOW** | `READY` | Eligible (privacy + soft-delete rules still apply) | Normal |
| **LIMIT** | `READY` + **explore-exclude** (dedicated boolean or documented reuse of hide-from-explore semantics — see 03) | Excluded from discovery surfaces; profile / direct link OK unless privacy blocks | Allowed |
| **REVIEW** | Soft hold: prefer `HIDDEN` **or** `READY` + exclude + `moderation_hold=true` (Phase 1 pick one; document in 03) | Held until human resolve | May delay “published to Explore” |
| **BLOCK** | Never soft-`READY` for first publish **or** force `REMOVED` / non-READY | Never in discovery | Author sees rejection reason from explain |
| **DELETE** | `REMOVED` | Out of all feeds | Takedown notice |

**User reports** remain a parallel signal: `REPORTED` + enqueue / boost review priority; they do not replace automated policy.

**Non-goals for Phase 1:** full strike lifecycle product UI, comment-only moderation fleet, geo-legal packs beyond rule table config.

---

## 6. Creator Trust

Trust is a **multiplier / prior** on automated decisions — not a free pass.

| Concept | Phase | Behavior |
|---------|-------|----------|
| `creator_trust_scores` | 3 | Rolling score from history of ALLOW / overrides / strikes / appeals |
| New accounts | 1 (simple) | Lower confidence floor → more `REVIEW` when signals conflict |
| Trusted creators | 3 | Soft LIMIT instead of REVIEW when risk mid-band; never skip **hard** overrides (child-safety, terrorism keywords) |
| `creator_policy_history` | 3 | Append-only decisions that affected the creator |

Phase 1 may stub trust as constants (`trust=0.5` for all) so the schema and API leave a hook without shipping scoring logic.

---

## 7. Explainability & trust for moderators

An automated decision is incomplete without:

- **Overall risk** 0–100 and **confidence** 0–1
- **Per-policy / per-label** outcomes
- **Evidence rows**: modality, reason code, snippet / tag id / originality match id, optional frame index or ASR timestamp
- **`policy_version`** and rule version ids
- Link back to CU `analysis_job_id` / feature content hash and originality report id

Moderators must be able to answer “why is this LIMITED?” in under 30 seconds from the Admin UI (Phase 2).

---

## 8. Out of scope (this TDD)

| Out | Why |
|-----|-----|
| Re-implementing CU or Originality workers | Consumer only |
| Neo4j / MLOps fleet | CU already deferred; not required for policy |
| Full legal CMS / multi-region statute DB | Encode as rules in Phase 1–2 |
| Mobile-native moderator app | Web Admin shell first |

---

## 9. Success criteria (product)

| Metric | Target direction |
|--------|------------------|
| Time-to-first-decision after CU+Originality complete | Seconds (async), not minutes of human backlog for low risk |
| % decisions with evidence ≥ 1 | 100% for non-ALLOW-hardcoded paths |
| False BLOCK rate (sampled) | Drive down via HITL + Phase 5 learning |
| Explore safety | No known BLOCK/DELETE video in public Explore |
| Ops | Deployable as Compose overlay next to CU worker |

Next: [02-PIPELINE-AND-POLICY-ENGINE.md](./02-PIPELINE-AND-POLICY-ENGINE.md)
