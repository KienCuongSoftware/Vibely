"""NSFW heuristic over stored CU tags / visual tagScores / text — no media I/O."""

from __future__ import annotations

import re
from typing import Any

_TAG_WEIGHTS = {
    "nsfw": 1.0,
    "explicit": 1.0,
    "porn": 1.0,
    "adult_content": 0.95,
    "adult": 0.85,
    "lingerie": 0.7,
    "seductive": 0.65,
    "kissing": 0.35,
}

_TEXT_PATTERNS = [
    (r"\bonlyfans\b", 0.55),
    (r"\bnudes?\b", 0.7),
    (r"\bporn\b", 0.75),
    (r"\bxxx\b", 0.7),
    (r"\bsex\s*tape\b", 0.8),
    (r"\bstrip\s*tease\b", 0.6),
]


def score(snapshot: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    contributions: list[dict[str, Any]] = []
    raw = 0.0

    for tag in snapshot.get("tags") or []:
        slug = str(tag.get("slug") or "").lower()
        weight = _TAG_WEIGHTS.get(slug)
        if weight is None:
            continue
        try:
            conf = float(tag.get("confidence") or 0)
        except (TypeError, ValueError):
            conf = 0.0
        part = weight * conf
        raw += part
        contributions.append({"source": "tag", "slug": slug, "confidence": conf, "part": round(part, 4)})

    visual = snapshot.get("visual_features") or {}
    tag_scores = visual.get("tagScores")
    if tag_scores is None and isinstance(visual.get("visualFeatures"), dict):
        tag_scores = visual["visualFeatures"].get("tagScores")
    if isinstance(tag_scores, list):
        for item in tag_scores:
            if not isinstance(item, dict):
                continue
            name = str(item.get("slug") or item.get("tag") or item.get("label") or "").lower()
            if not any(k in name for k in ("nsfw", "nude", "explicit", "sexy", "porn", "adult")):
                continue
            try:
                conf = float(item.get("score") or item.get("confidence") or 0)
            except (TypeError, ValueError):
                conf = 0.0
            part = 0.85 * conf
            raw += part
            contributions.append({"source": "visual_tagScore", "name": name, "part": round(part, 4)})

    text_blob = " ".join(
        str(snapshot.get(f) or "")
        for f in ("title", "description", "ocr_text", "speech_text")
    )
    for pattern, weight in _TEXT_PATTERNS:
        if weight <= 0:
            continue
        if re.search(pattern, text_blob, re.IGNORECASE):
            raw += weight
            contributions.append({"source": "text", "pattern": pattern, "part": weight})

    # Soft saturation — similar to logistic without scipy.
    score_v = max(0.0, min(1.0, 1.0 - pow(2.71828, -raw)))
    top = sorted(contributions, key=lambda c: float(c.get("part") or 0), reverse=True)[:5]
    snippet = f"nsfw_cu_v1={score_v:.2f}"
    if top:
        bit = top[0]
        snippet = f"nsfw_cu_v1={score_v:.2f} via {bit.get('source')}:{bit.get('slug') or bit.get('name') or bit.get('pattern')}"

    return {
        "score": round(score_v, 4),
        "snippet": snippet[:240],
        "details": {"raw": round(raw, 4), "top": top},
    }
