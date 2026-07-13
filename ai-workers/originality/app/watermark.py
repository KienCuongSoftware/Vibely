from __future__ import annotations

import logging
from pathlib import Path

from PIL import Image

from .ocr import normalize_text, _get_ocr

LOG = logging.getLogger("originality.watermark")

PLATFORM_KEYWORDS = (
    "tiktok",
    "douyin",
    "capcut",
    "instagram",
    "reels",
    "youtube",
    "shorts",
    "facebook",
    "fb watch",
    "snackvideo",
    "threads",
)


def _corner_crops(image_path: Path) -> list[Image.Image]:
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    cw, ch = max(32, w // 3), max(32, h // 5)
    boxes = [
        (0, 0, cw, ch),
        (w - cw, 0, w, ch),
        (0, h - ch, cw, h),
        (w - cw, h - ch, w, h),
    ]
    return [img.crop(box) for box in boxes]


def detect_platform_watermark(frame_paths: list[Path], max_frames: int = 8) -> tuple[float, dict, str]:
    ocr = _get_ocr()
    if ocr is False:
        return 0.0, {"labels": [], "hits": 0}, "watermark:corner_ocr:unavailable"

    step = max(1, len(frame_paths) // max_frames)
    sample = frame_paths[::step][:max_frames]
    hits = 0
    labels: list[str] = []
    hit_frames: list[int] = []
    for idx, path in enumerate(sample):
        found = False
        for crop in _corner_crops(path):
            tmp = path.parent / f"_wm_{path.stem}_{idx}.jpg"
            crop.save(tmp, quality=90)
            try:
                result, _ = ocr(str(tmp))
            finally:
                tmp.unlink(missing_ok=True)
            blob = []
            if result:
                for line in result:
                    if line and len(line) >= 2:
                        blob.append(str(line[1]))
            text = normalize_text(" ".join(blob))
            for kw in PLATFORM_KEYWORDS:
                if kw in text:
                    found = True
                    labels.append(kw)
                    break
            if found:
                break
        if found:
            hits += 1
            hit_frames.append(idx)
    score = hits / max(1, len(sample))
    explain = {
        "labels": sorted(set(labels)),
        "hits": hits,
        "sampled": len(sample),
        "frames": hit_frames,
    }
    return float(score), explain, "watermark:corner_ocr:rapidocr"
