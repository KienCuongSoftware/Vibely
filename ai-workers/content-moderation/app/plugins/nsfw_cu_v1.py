"""NSFW heuristic over stored CU tags / visual tagScores / text — no media I/O."""

from __future__ import annotations

import re
from typing import Any

_TAG_WEIGHTS = {
    "nsfw": 1.0,
    "explicit": 1.0,
    "porn": 1.0,
    "adult_content": 0.95,
    "adult": 0.9,
    "nudity": 0.95,
    "lingerie": 0.75,
    "seductive": 0.7,
    "kissing": 0.4,
}

_VISUAL_TAG_SCORE_MULT = 0.95
_MODERATION_SCORE_MULT = 1.15
_NSFW_MOD_SLUGS = frozenset(
    {"nsfw", "porn", "nudity", "explicit", "adult", "adult_content", "lingerie", "seductive"}
)

# Weight ~ contribution; many hits saturate via soft logistic.
_TEXT_PATTERNS = [
    (r"\bonlyfans\b|fansly|pornhub|xvideos|\bxnxx\b", 0.7),
    (r"\bnudes?\b|nude\s*pic|send\s*nudes|free\s*nudes|follow\s*(?:for|of|4)\s*nudes?", 0.75),
    (r"\bporn\b|\bxxx\b|sex\s*tape|strip\s*tease|cam\s*sex|live\s*sex|sex\s*chat", 0.7),
    (r"\bfuck(?:ing)?\b|motherfucker|\bcunt\b|\bpussy\b|\bdick\b|\bcock\b", 0.75),
    (r"\btits?\b|boobs|\bwhore\b|\bslut\b|\bbitch\b|asshole|\banal\b", 0.65),
    (r"blow\s*job|hand\s*job|deepthroat|creampie|cumshot|hentai|lolicon", 0.8),
    (r"child\s*porn|underage\s*sex|teen\s*porn|cp\s*trade", 0.95),
    # Vietnamese sexual / vulgar (no ASCII \b — diacritics)
    (
        r"đầu\s*buồi|dau\s*buoi|buồi|\bbuoi\b|cặc|\bcak\b|lồn|\bloz\b|\blìn\b|"
        r"địt|đụ|\bchịch\b|\bchich\b|đéo|\bđcm\b|\bdcm\b",
        0.85,
    ),
    (
        r"địt\s*mẹ|dit\s*me|đụ\s*mẹ|du\s*me|mẹ\s*mày|con\s*đĩ|con\s*di|\bđĩ\b|điếm|"
        r"gái\s*gọi|gai\s*goi|bú\s*cu|liếm\s*lồn|làm\s*tình|lam\s*tinh",
        0.8,
    ),
    (
        r"ảnh\s*nóng|anh\s*nong|video\s*nóng|clip\s*sex|xem\s*sex|phim\s*sex|"
        r"khoe\s*vú|khoe\s*vu|khoe\s*đít|không\s*mặc\s*quần|phim\s*18\+|jav\b",
        0.75,
    ),
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
    nested_vf = visual.get("visualFeatures") if isinstance(visual.get("visualFeatures"), dict) else {}

    mod_scores = visual.get("moderationScores")
    if mod_scores is None:
        mod_scores = nested_vf.get("moderationScores") if nested_vf else None
    if isinstance(mod_scores, list):
        for item in mod_scores:
            if not isinstance(item, dict):
                continue
            slug = str(item.get("slug") or "").lower()
            if slug not in _NSFW_MOD_SLUGS:
                continue
            try:
                conf = float(item.get("confidence") or item.get("score") or 0)
            except (TypeError, ValueError):
                conf = 0.0
            if conf < 0.25:
                continue
            part = _MODERATION_SCORE_MULT * conf
            raw += part
            contributions.append(
                {"source": "moderationScores", "slug": slug, "confidence": conf, "part": round(part, 4)}
            )

    tag_scores = visual.get("tagScores")
    if tag_scores is None:
        tag_scores = nested_vf.get("tagScores") if nested_vf else None
    if isinstance(tag_scores, list):
        for item in tag_scores:
            if not isinstance(item, dict):
                continue
            name = str(item.get("slug") or item.get("tag") or item.get("label") or "").lower()
            if not any(
                k in name
                for k in ("nsfw", "nude", "nudity", "explicit", "sexy", "porn", "adult", "lingerie", "seductive")
            ):
                continue
            try:
                conf = float(item.get("score") or item.get("confidence") or 0)
            except (TypeError, ValueError):
                conf = 0.0
            part = _VISUAL_TAG_SCORE_MULT * conf
            raw += part
            contributions.append({"source": "visual_tagScore", "name": name, "part": round(part, 4)})

    text_blob = " ".join(
        str(snapshot.get(f) or "")
        for f in ("description", "ocr_text", "speech_text")
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
