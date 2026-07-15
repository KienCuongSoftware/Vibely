"""Shared lexicon + tag matching for metadata/OCR/speech text."""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from .vocab_catalog import LEXICON

HASHTAG_RE = re.compile(
    r"[#＃＠@]?([0-9A-Za-z_\u00C0-\u024F\u1E00-\u1EFF\u3040-\u30FF\u3400-\u9FFF]+)",
    re.UNICODE,
)


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()


def _keyword_hit(keyword: str, blob_raw: str, blob_norm: str) -> bool:
    """Prefer word-boundary / phrase match to avoid 'boxing'∈'unboxing' false hits."""
    kw_raw = keyword.strip()
    if not kw_raw:
        return False
    kw_norm = strip_accents(kw_raw)
    # Multi-word phrase: require contiguous phrase in normalized blob.
    if " " in kw_norm or "-" in kw_norm:
        return kw_norm in blob_norm or kw_raw.lower() in blob_raw.lower()
    # Single token: word boundary (digits/letters). Length-1/2 still constrained.
    if len(kw_norm) <= 2:
        return False
    pattern = rf"(?<![0-9a-z_]){re.escape(kw_norm)}(?![0-9a-z_])"
    if re.search(pattern, blob_norm, flags=re.IGNORECASE):
        return True
    # Fallback on raw (accents) with same boundary idea for non-ascii tokens
    if any(ord(ch) > 127 for ch in kw_raw):
        pattern_raw = rf"(?<!\w){re.escape(kw_raw)}(?!\w)"
        return bool(re.search(pattern_raw, blob_raw, flags=re.IGNORECASE))
    return False


def match_lexicon(
    blob_raw: str,
    blob_norm: str,
    *,
    source: str,
    model_version: str,
    min_confidence: float = 0.55,
) -> list[dict[str, Any]]:
    tags: list[dict[str, Any]] = []
    matched: list[str] = []

    for slug, keywords in LEXICON.items():
        hits = [kw for kw in keywords if _keyword_hit(kw, blob_raw, blob_norm)]
        if not hits:
            continue
        conf = min(0.95, 0.55 + 0.08 * len(hits))
        if conf < min_confidence:
            continue
        tags.append(
            {
                "slug": slug,
                "confidence": round(conf, 3),
                "source": source,
                "modelVersion": model_version,
                "reason": f"keyword hit: {', '.join(hits[:5])}",
                "evidence": {"field": source, "hits": hits[:5]},
            }
        )
        matched.append(slug)

    for raw in HASHTAG_RE.findall(blob_raw):
        key = strip_accents(raw)
        raw_key = raw.strip()
        for slug, keywords in LEXICON.items():
            kw_norms = {strip_accents(k) for k in keywords}
            if key == slug or key in kw_norms or raw_key.lower() == slug or raw_key in keywords:
                if slug in matched:
                    for t in tags:
                        if t["slug"] == slug:
                            t["confidence"] = max(float(t["confidence"]), 0.92)
                            t["reason"] = f"{t['reason']}; hashtag #{raw}"
                    continue
                tags.append(
                    {
                        "slug": slug,
                        "confidence": 0.92,
                        "source": source,
                        "modelVersion": model_version,
                        "reason": f"hashtag #{raw}",
                        "evidence": {"hashtag": raw},
                    }
                )
                matched.append(slug)

    return tags


def merge_tags(*groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Backward-compatible entrypoint — delegates to late weighted fusion."""
    from .fusion import fuse_tags

    return fuse_tags(*groups)
