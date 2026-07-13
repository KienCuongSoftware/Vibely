"""Weak metadata heuristics (filename / title / caption / URL)."""

from __future__ import annotations

DOWNLOADER_MARKERS = (
    "snaptik",
    "ssstik",
    "tikmate",
    "musicaldown",
    "tiktokdownload",
    "tiktokcdn",
    "douyindownload",
    "savefrom",
    "y2mate",
    "getvideo",
    "reelsaver",
    "snapinsta",
    "fastdl",
    "downloadvideotiktok",
)

PLATFORM_NAME_MARKERS = (
    "tiktok",
    "douyin",
    "capcut",
    "instagram",
    "reels",
    "youtube",
    "shorts",
    "snackvideo",
)


def score_metadata_hints(
    *,
    video_url: str = "",
    title: str = "",
    description: str = "",
) -> tuple[float, dict]:
    blob = " ".join(
        [
            str(video_url or ""),
            str(title or ""),
            str(description or ""),
        ]
    ).lower()

    downloader_hits = [m for m in DOWNLOADER_MARKERS if m in blob]
    platform_hits = [m for m in PLATFORM_NAME_MARKERS if m in blob]

    score = 0.0
    if downloader_hits:
        # Strong prior: filename/caption from known TikTok/IG downloaders.
        score = 0.92
    elif platform_hits and any(x in blob for x in ("_", "-", ".mp4", ".mov", ".webm")):
        # Weaker: platform name in filename without clear downloader brand.
        score = 0.55

    return float(score), {
        "downloaderHints": downloader_hits,
        "platformHints": platform_hits,
        "titlePreview": (title or "")[:120],
    }
