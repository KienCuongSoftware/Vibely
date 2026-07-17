from __future__ import annotations

import re
from typing import Any

from .plugins import run_plugins


SEVERITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
DECISION_RANK = {"ALLOW": 0, "LIMIT": 1, "REVIEW": 2, "BLOCK": 3, "DELETE": 4}


def evaluate(claim: dict[str, Any]) -> dict[str, Any]:
    snapshot = dict(claim.get("snapshot") or {})
    policy = claim.get("policy") or {}
    rules = claim.get("rules") or []
    originality_pending = bool(claim.get("originalityPending") or snapshot.get("originality_pending"))

    # Phase 4: detector plugins on stored CU features (never re-download media).
    plugin_results = run_plugins(claim)
    snapshot["plugins"] = plugin_results

    thresholds = policy.get("thresholds") or {}
    weights = policy.get("weights") or {}
    allow_max = int(thresholds.get("allow_max", 24))
    limit_max = int(thresholds.get("limit_max", 49))
    review_max = int(thresholds.get("review_max", 74))
    confidence_floor = float(thresholds.get("confidence_floor", 0.45))

    firings: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    label_scores: dict[str, float] = {}
    label_rules: dict[str, list[str]] = {}

    # Always persist non-trivial plugin scores as PLUGIN evidence.
    for code, result in plugin_results.items():
        try:
            pscore = float(result.get("score") or 0)
        except (TypeError, ValueError):
            pscore = 0.0
        min_emit = 0.25
        cfg = {}
        for det in claim.get("detectors") or []:
            if str(det.get("code") or "") == code:
                cfg = det.get("config") or {}
                break
        try:
            min_emit = float(cfg.get("min_emit", min_emit))
        except (TypeError, ValueError):
            pass
        if pscore < min_emit:
            continue
        evidence.append(
            {
                "sourceModality": "PLUGIN",
                "reasonCode": f"plugin.{code}",
                "snippet": result.get("snippet") or f"{code}={pscore:.2f}",
                "frameIndex": None,
                "timeMs": None,
                "weight": pscore,
                "refJson": {
                    "type": "plugin",
                    "plugin": code,
                    "score": pscore,
                    "details": result.get("details") or {},
                    "artifact_kind": result.get("artifact_kind"),
                },
            }
        )

    for rule in sorted(rules, key=lambda r: int(r.get("priority") or 100)):
        hit = _match_rule(rule, snapshot)
        if not hit:
            continue
        code = str(rule.get("code") or "")
        label = str(rule.get("label") or "unknown")
        severity = str(rule.get("severity") or "MEDIUM").upper()
        points = int(rule.get("points") or weights.get(severity) or 10)
        action_hint = str(rule.get("action_hint") or "REVIEW").upper()
        override = bool(rule.get("override"))
        firing = {
            "rule_code": code,
            "label": label,
            "severity": severity,
            "points": points,
            "action_hint": action_hint,
            "override": override,
            "evidence_ref": hit.get("evidence_ref") or {},
        }
        firings.append(firing)
        label_scores[label] = label_scores.get(label, 0.0) + float(points)
        label_rules.setdefault(label, []).append(code)
        # Skip duplicate PLUGIN evidence when rule already covered by emit above.
        if hit.get("modality") == "PLUGIN" and any(
            e.get("reasonCode") == f"plugin.{(hit.get('evidence_ref') or {}).get('plugin')}"
            for e in evidence
        ):
            # Upgrade weight/snippet to rule firing points for audit clarity.
            for e in evidence:
                if e.get("reasonCode") == f"plugin.{(hit.get('evidence_ref') or {}).get('plugin')}":
                    e["weight"] = float(points)
                    e["reasonCode"] = code
                    e["snippet"] = hit.get("snippet") or e.get("snippet")
                    e["refJson"] = {**(e.get("refJson") or {}), **(hit.get("evidence_ref") or {}), "rule_code": code}
                    break
            continue
        evidence.append(
            {
                "sourceModality": hit.get("modality", "RULE"),
                "reasonCode": code,
                "snippet": hit.get("snippet"),
                "frameIndex": hit.get("frame_index"),
                "timeMs": hit.get("time_ms"),
                "weight": float(points),
                "refJson": hit.get("evidence_ref") or {},
            }
        )

    override_firings = [f for f in firings if f.get("override")]
    override_applied = False
    decision: str
    risk: int

    if override_firings:
        override_applied = True
        best = max(
            override_firings,
            key=lambda f: (
                SEVERITY_RANK.get(str(f.get("severity")), 0),
                DECISION_RANK.get(str(f.get("action_hint")), 0),
            ),
        )
        decision = str(best.get("action_hint") or "REVIEW").upper()
        risk = min(100, sum(int(f.get("points") or 0) for f in firings))
    else:
        risk = min(100, sum(int(f.get("points") or 0) for f in firings))
        if risk <= allow_max:
            decision = "ALLOW"
        elif risk <= limit_max:
            decision = "LIMIT"
        elif risk <= review_max:
            decision = "REVIEW"
        else:
            decision = "BLOCK"
        # Soft action_hint acts as a floor (e.g. originality LIMIT cannot collapse to ALLOW).
        for f in firings:
            hint = str(f.get("action_hint") or "ALLOW").upper()
            if DECISION_RANK.get(hint, 0) > DECISION_RANK.get(decision, 0):
                decision = hint
        # Soft ceiling: without hard override, never exceed the strongest soft hint.
        # Stops stacked REVIEW visual points (risk>74) from escalating to BLOCK/REMOVED.
        soft_hints = [
            str(f.get("action_hint") or "ALLOW").upper()
            for f in firings
            if not f.get("override")
        ]
        if soft_hints:
            ceil = max(soft_hints, key=lambda h: DECISION_RANK.get(h, 0))
            if DECISION_RANK.get(decision, 0) > DECISION_RANK.get(ceil, 0):
                decision = ceil

    confidence = _confidence(snapshot, originality_pending, firings)
    if decision in {"LIMIT", "BLOCK"} and confidence < confidence_floor:
        decision = "REVIEW"

    # Phase 3 creator trust soft-bias (never weakens hard overrides).
    try:
        trust = float(snapshot.get("trust_score") or 0.5)
    except (TypeError, ValueError):
        trust = 0.5
    if not override_applied and trust >= 0.75 and decision == "REVIEW" and risk < 60:
        decision = "LIMIT"
    if not override_applied and trust <= 0.25 and decision == "ALLOW" and risk >= 15:
        decision = "REVIEW"

    policy_results = [
        {
            "label": label,
            "outcome": decision if score > 0 else "NONE",
            "score": score,
            "ruleCodes": label_rules.get(label, []),
            "detailJson": {},
        }
        for label, score in sorted(label_scores.items())
    ]

    explain = {
        "policy_version": claim.get("policyVersion") or policy.get("code"),
        "risk": risk,
        "confidence": confidence,
        "decision": decision,
        "override_applied": override_applied,
        "originality_pending": originality_pending,
        "bands": {
            "allow_max": allow_max,
            "limit_max": limit_max,
            "review_max": review_max,
        },
        "firings": firings,
        "plugins": {
            code: {"score": (result or {}).get("score"), "snippet": (result or {}).get("snippet")}
            for code, result in plugin_results.items()
        },
        "inputs": {
            "analysis_job_id": snapshot.get("analysis_job_id"),
            "content_features_sha": snapshot.get("content_sha256"),
            "originality_report_id": snapshot.get("originality_report_id"),
            "tag_count": len(snapshot.get("tags") or []),
            "has_visual_features": bool(snapshot.get("visual_features")),
            "has_object_features": bool(snapshot.get("object_features")),
        },
    }

    return {
        "risk": risk,
        "confidence": confidence,
        "decision": decision,
        "overrideApplied": override_applied,
        "originalityPending": originality_pending,
        "explainJson": explain,
        "engineVersion": "mod-policy-v1.4-plugins",
        "evidence": evidence,
        "policyResults": policy_results,
    }


def _confidence(snapshot: dict[str, Any], originality_pending: bool, firings: list[dict[str, Any]]) -> float:
    score = 0.35
    if snapshot.get("ocr_text"):
        score += 0.12
    if snapshot.get("speech_text"):
        score += 0.12
    if snapshot.get("tags"):
        score += 0.12
    plugins = snapshot.get("plugins") or {}
    if any(float((p or {}).get("score") or 0) >= 0.4 for p in plugins.values()):
        score += 0.08
    originality = snapshot.get("originality") or {}
    if originality.get("present"):
        score += 0.18
        try:
            score += 0.1 * float(originality.get("overall_confidence") or 0)
        except (TypeError, ValueError):
            pass
    if originality_pending:
        score *= 0.7
    if not firings and not originality_pending:
        score = max(score, 0.55)
    return round(min(1.0, max(0.05, score)), 4)


def _match_rule(rule: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    match = rule.get("match") or {}
    kind = str(match.get("type") or "").lower()
    if kind == "originality_decision":
        return _match_originality(match, snapshot)
    if kind == "lexicon":
        return _match_lexicon(match, snapshot)
    if kind == "semantic_tags":
        return _match_tags(match, snapshot)
    if kind == "plugin_score":
        return _match_plugin_score(match, snapshot)
    return None


def _match_plugin_score(match: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    plugin = str(match.get("plugin") or "").strip()
    if not plugin:
        return None
    try:
        min_score = float(match.get("min_score") or 0.55)
    except (TypeError, ValueError):
        min_score = 0.55
    max_score = None
    if match.get("max_score") is not None:
        try:
            max_score = float(match.get("max_score"))
        except (TypeError, ValueError):
            max_score = None
    plugins = snapshot.get("plugins") or {}
    result = plugins.get(plugin) if isinstance(plugins, dict) else None
    if not isinstance(result, dict):
        return None
    try:
        pscore = float(result.get("score") or 0)
    except (TypeError, ValueError):
        pscore = 0.0
    if pscore < min_score:
        return None
    if max_score is not None and pscore > max_score:
        return None
    return {
        "modality": "PLUGIN",
        "snippet": result.get("snippet") or f"{plugin}={pscore:.2f}",
        "evidence_ref": {
            "type": "plugin_score",
            "plugin": plugin,
            "score": pscore,
            "min_score": min_score,
            "max_score": max_score,
            "details": result.get("details") or {},
        },
    }


def _match_originality(match: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    originality = snapshot.get("originality") or {}
    if not originality.get("present"):
        return None
    decision = str(originality.get("decision") or "").upper()
    wanted = {str(d).upper() for d in (match.get("decisions") or [])}
    if decision not in wanted:
        return None
    min_conf = match.get("min_confidence")
    if min_conf is not None:
        try:
            if float(originality.get("overall_confidence") or 0) < float(min_conf):
                return None
        except (TypeError, ValueError):
            return None
    return {
        "modality": "ORIGINALITY",
        "snippet": f"originality.decision={decision}",
        "evidence_ref": {
            "type": "originality_report",
            "id": originality.get("id"),
            "decision": decision,
        },
    }


def _match_lexicon(match: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    fields = match.get("fields") or ["ocr_text", "speech_text"]
    patterns = match.get("patterns") or []
    flags = re.IGNORECASE if "i" in str(match.get("flags") or "i").lower() else 0
    blobs: list[tuple[str, str]] = []
    for field in fields:
        text = str(snapshot.get(field) or "")
        if text:
            blobs.append((field, text))
    for field, text in blobs:
        for pattern in patterns:
            try:
                rx = re.compile(str(pattern), flags)
            except re.error:
                continue
            found = rx.search(text)
            if found:
                start = max(0, found.start() - 40)
                end = min(len(text), found.end() + 40)
                return {
                    "modality": "OCR" if field == "ocr_text" else ("SPEECH" if field == "speech_text" else "METADATA"),
                    "snippet": text[start:end],
                    "evidence_ref": {"type": "lexicon", "field": field, "pattern": pattern},
                }
    return None


def _match_tags(match: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    wanted = {str(s).lower() for s in (match.get("slugs") or [])}
    min_conf = float(match.get("min_confidence") or 0.0)
    for tag in snapshot.get("tags") or []:
        slug = str(tag.get("slug") or "").lower()
        try:
            conf = float(tag.get("confidence") or 0)
        except (TypeError, ValueError):
            conf = 0.0
        if slug in wanted and conf >= min_conf:
            return {
                "modality": "TAG",
                "snippet": f"{slug}@{conf:.2f}",
                "evidence_ref": {"type": "semantic_tag", "slug": slug, "confidence": conf},
            }
    return None
