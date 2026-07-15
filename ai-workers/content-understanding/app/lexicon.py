"""Shared lexicon + tag matching for metadata/OCR/speech text."""

from __future__ import annotations

import re
import unicodedata
from typing import Any

HASHTAG_RE = re.compile(
    r"[#＃＠@]?([0-9A-Za-z_\u00C0-\u024F\u1E00-\u1EFF\u3040-\u30FF\u3400-\u9FFF]+)",
    re.UNICODE,
)

LEXICON: dict[str, tuple[str, ...]] = {
    "anime": ("anime", "manga", "waifu", "naruto", "onepiece", "アニメ", "アニメーション"),
    "music": ("music", "lyrics", "song", "lofi", "amnhac", "nhac", "音楽", "nhạc"),
    "horror": ("horror", "ghost", "kinhdi", "creepy", "ホラー", "truyenma"),
    "gaming": ("gaming", "game", "valorant", "minecraft", "lol", "esports"),
    "food": ("food", "amthuc", "pho", "bun", "an uong", "đồ ăn"),
    "travel": ("travel", "dulich", "dalat", "beach", "mountain", "du lịch"),
    "comedy": ("comedy", "funny", "haihuoc", "meme", "hài"),
    "education": ("education", "hoc", "tutorial", "coding", "java", "spring", "học"),
    "night": ("night", "dem", "midnight", "đêm"),
    "sad": ("sad", "buon", "buồn"),
    "lofi": ("lofi", "chill"),
    "lyrics": ("lyrics", "loi bai hat", "lời bài hát"),
    "coding": ("coding", "laptrinh", "docker", "postgresql", "lập trình"),
    "cat": ("cat", "meo", "mèo"),
    "dog": ("dog", "cho", "chó"),
    "rain": ("rain", "mua", "mưa"),
    "city": ("city", "thanh pho", "saigon", "hanoi", "thành phố"),
    "girl": ("girl", "con gai", "cô gái"),
    "boy": ("boy", "con trai", "chàng trai"),
    "manga": ("manga", "comic", "manhwa"),
}


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()


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
        hits = [kw for kw in keywords if kw in blob_norm or kw in blob_raw]
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
            if key == slug or key in keywords or raw_key in keywords or raw_key == slug:
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
    by_slug: dict[str, dict[str, Any]] = {}
    for group in groups:
        for item in group:
            slug = item["slug"]
            if slug not in by_slug:
                by_slug[slug] = dict(item)
                continue
            cur = by_slug[slug]
            cur["confidence"] = round(max(float(cur["confidence"]), float(item["confidence"])), 3)
            cur["reason"] = f"{cur['reason']}; {item['reason']}"
            sources = {cur.get("source"), item.get("source")}
            sources.discard(None)
            if len(sources) > 1:
                cur["source"] = "fusion"
    return list(by_slug.values())
