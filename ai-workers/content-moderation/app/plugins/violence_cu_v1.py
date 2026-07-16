"""Violence heuristic over stored CU object/tag/text features — no media I/O."""

from __future__ import annotations

import re
from typing import Any

_TAG_WEIGHTS = {
    "mma": 0.6,
    "boxing": 0.55,
    "wrestling": 0.5,
    "violence": 0.95,
    "gore": 1.0,
    "weapon": 0.92,
    "guns": 0.95,
    "gun": 0.95,
    "blood": 0.85,
    "knife_fight": 0.9,
    "action": 0.2,
    "horror": 0.35,
}

# COCO / YOLO class names with violence prior (knife alone is usually food).
_OBJECT_WEIGHTS = {
    "baseball bat": 0.55,
    "knife": 0.35,
    "scissors": 0.2,
    "gun": 0.95,
    "rifle": 0.95,
    "pistol": 0.95,
    "sword": 0.7,
}

_TEXT_PATTERNS = [
    (r"\b(gore|bloodbath|behead(?:ing)?|decapitat\w*|massacre|genocide)\b", 0.85),
    (r"\b(shoot(?:ing)?|gunfight|stab(?:bing)?|murder|homicide|serial\s*killer)\b", 0.75),
    (r"\b(kill\s+(?:him|her|you|people|them|everyone)|i'?ll\s+kill|i\s+will\s+kill)\b", 0.8),
    (r"\b(school\s*shooting|mass\s*shooting|terror\s*attack|bomb\s*threat|make\s*a\s*bomb)\b", 0.9),
    (r"\b(how\s*to\s*kill|rape\s*and\s*kill|join\s*isis|al-?qaeda)\b", 0.9),
    # Vietnamese violence / murder / rape / terror
    (
        r"giết\s*người|giet\s*nguoi|giết\s*chết|giet\s*chet|giết\s*hết|"
        r"ám\s*sát|am\s*sat|thảm\s*sát|tham\s*sat|tàn\s*sát",
        0.9,
    ),
    (
        r"khủng\s*bố|khung\s*bo|đặt\s*bom|dat\s*bom|đánh\s*bom|danh\s*bom|"
        r"xả\s*súng|xa\s*sung|bắn\s*chết|ban\s*chet",
        0.9,
    ),
    (
        r"chém\s*giết|chem\s*giet|chém\s*đầu|đâm\s*chết|dam\s*chet|"
        r"cắt\s*cổ|cat\s*co|chặt\s*đầu|thiêu\s*sống",
        0.85,
    ),
    (
        r"hiếp\s*dâm|hiep\s*dam|cưỡng\s*hiếp|cuong\s*hiep|cưỡng\s*bức|"
        r"hãm\s*hiếp|tra\s*tấn|tra\s*tan",
        0.9,
    ),
    (r"tự\s*sát|tu\s*sat|tự\s*vẫn|kill\s*myself|\bsuicide\b", 0.7),
]

_VISUAL_VIOLENCE_KEYS = (
    "violence",
    "gore",
    "weapon",
    "gun",
    "guns",
    "blood",
    "fight",
    "assault",
    "murder",
)
_VISUAL_TAG_SCORE_MULT = 0.92
_MODERATION_SCORE_MULT = 1.15
_VIOLENCE_MOD_SLUGS = frozenset({"violence", "gore", "guns", "weapon", "blood"})


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
            if slug not in _VIOLENCE_MOD_SLUGS:
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
            if not any(k in name for k in _VISUAL_VIOLENCE_KEYS):
                continue
            try:
                conf = float(item.get("score") or item.get("confidence") or 0)
            except (TypeError, ValueError):
                conf = 0.0
            part = _VISUAL_TAG_SCORE_MULT * conf
            raw += part
            contributions.append({"source": "visual_tagScore", "name": name, "part": round(part, 4)})

    objects = snapshot.get("object_features") or {}
    class_counts = objects.get("classCounts") if isinstance(objects, dict) else None
    class_max = objects.get("classMaxConf") if isinstance(objects, dict) else None
    if isinstance(class_counts, dict):
        for name, count in class_counts.items():
            key = str(name).lower()
            weight = _OBJECT_WEIGHTS.get(key)
            if weight is None:
                continue
            try:
                n = float(count)
            except (TypeError, ValueError):
                n = 1.0
            max_conf = 0.5
            if isinstance(class_max, dict) and name in class_max:
                try:
                    max_conf = float(class_max[name])
                except (TypeError, ValueError):
                    max_conf = 0.5
            # Knife needs company (person detections or violence text later).
            person_n = 0.0
            try:
                person_n = float(objects.get("personDetections") or 0)
            except (TypeError, ValueError):
                person_n = 0.0
            mult = 1.0
            if key == "knife":
                mult = 0.55 if person_n >= 1 else 0.4
            elif key == "baseball bat" and person_n >= 1:
                mult = 1.15
            part = weight * min(1.0, 0.35 + 0.15 * n) * max_conf * mult
            raw += part
            contributions.append(
                {
                    "source": "object",
                    "class": key,
                    "count": n,
                    "maxConf": max_conf,
                    "part": round(part, 4),
                }
            )

    for label in snapshot.get("object_labels") or []:
        key = str(label).lower()
        weight = _OBJECT_WEIGHTS.get(key)
        if weight is None:
            continue
        if any(c.get("class") == key for c in contributions if c.get("source") == "object"):
            continue
        part = weight * 0.4
        raw += part
        contributions.append({"source": "object_label", "class": key, "part": round(part, 4)})

    text_blob = " ".join(
        str(snapshot.get(f) or "")
        for f in ("description", "ocr_text", "speech_text")
    )
    for pattern, weight in _TEXT_PATTERNS:
        if re.search(pattern, text_blob, re.IGNORECASE):
            raw += weight
            contributions.append({"source": "text", "pattern": pattern, "part": weight})

    score_v = max(0.0, min(1.0, 1.0 - pow(2.71828, -raw)))
    top = sorted(contributions, key=lambda c: float(c.get("part") or 0), reverse=True)[:5]
    snippet = f"violence_cu_v1={score_v:.2f}"
    if top:
        bit = top[0]
        snippet = (
            f"violence_cu_v1={score_v:.2f} via "
            f"{bit.get('source')}:{bit.get('slug') or bit.get('class') or bit.get('pattern')}"
        )

    return {
        "score": round(score_v, 4),
        "snippet": snippet[:240],
        "details": {"raw": round(raw, 4), "top": top},
    }
