"""OCR over sampled frames — RapidOCR (same stack as originality)."""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Any

import cv2

LOG = logging.getLogger("content_understanding.ocr")

_OCR = None
_OCR_FAILED = False


def _get_ocr():
    global _OCR, _OCR_FAILED
    if _OCR_FAILED:
        return None
    if _OCR is not None:
        return _OCR
    try:
        from rapidocr_onnxruntime import RapidOCR

        _OCR = RapidOCR()
        LOG.info("RapidOCR ready")
        return _OCR
    except Exception as exc:  # noqa: BLE001
        _OCR_FAILED = True
        LOG.warning("RapidOCR unavailable — OCR skipped: %s", exc)
        return None


def run_ocr_on_frames(frames: list[dict]) -> dict[str, Any]:
    """
    Returns {texts: [...], note, engine, ...}.
    Each text: {text, confidence, frameIndex, tMs}
    """
    if not frames:
        return {"texts": [], "note": "no frames", "engine": None}

    if os.environ.get("CU_OCR_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        return {"texts": [], "note": "CU_OCR_ENABLED=false", "engine": None}

    ocr = _get_ocr()
    if ocr is None:
        return {"texts": [], "note": "rapidocr unavailable", "engine": None}

    texts: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix="cu-ocr-") as tmp:
        tmp_path = Path(tmp)
        for frame in frames:
            image = frame.get("image")
            if image is None:
                continue
            jpg = tmp_path / f"f{frame.get('index', 0)}.jpg"
            if not cv2.imwrite(str(jpg), image):
                continue
            try:
                result, _ = ocr(str(jpg))
            except Exception as exc:  # noqa: BLE001
                LOG.warning("OCR failed frame=%s: %s", frame.get("index"), exc)
                continue
            if not result:
                continue
            for line in result:
                # line = [box, text, score]
                if not line or len(line) < 2:
                    continue
                text = str(line[1]).strip()
                conf = float(line[2]) if len(line) > 2 else 0.6
                if not text or conf < 0.45:
                    continue
                texts.append(
                    {
                        "text": text,
                        "confidence": round(conf, 3),
                        "frameIndex": frame.get("frameIndex"),
                        "tMs": frame.get("tMs"),
                    }
                )

    best: dict[str, dict[str, Any]] = {}
    for row in texts:
        key = row["text"].casefold()
        prev = best.get(key)
        if prev is None or float(row["confidence"]) > float(prev["confidence"]):
            best[key] = row

    merged = sorted(best.values(), key=lambda r: float(r["confidence"]), reverse=True)
    return {
        "texts": merged[:80],
        "note": "phase1.1 rapidocr-onnxruntime",
        "engine": "rapidocr-onnxruntime",
        "frameCount": len(frames),
        "rawHitCount": len(texts),
    }
