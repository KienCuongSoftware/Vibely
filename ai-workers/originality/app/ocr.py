from __future__ import annotations

import logging
import re
from pathlib import Path

LOG = logging.getLogger("originality.ocr")

_OCR = None


def _get_ocr():
    global _OCR
    if _OCR is not None:
        return _OCR
    try:
        from rapidocr_onnxruntime import RapidOCR

        _OCR = RapidOCR()
        return _OCR
    except Exception as exc:  # noqa: BLE001
        LOG.warning("RapidOCR unavailable (%s)", exc)
        _OCR = False
        return _OCR


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9#@\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def ocr_frames(frame_paths: list[Path], max_frames: int = 12) -> tuple[str, str]:
    ocr = _get_ocr()
    if ocr is False:
        return "", "rapidocr:unavailable"
    texts: list[str] = []
    step = max(1, len(frame_paths) // max_frames)
    sample = frame_paths[::step][:max_frames]
    for path in sample:
        try:
            result, _ = ocr(str(path))
        except Exception as exc:  # noqa: BLE001
            LOG.debug("OCR frame fail %s: %s", path, exc)
            continue
        if not result:
            continue
        for line in result:
            # line = [box, text, score]
            if line and len(line) >= 2:
                texts.append(str(line[1]))
    joined = normalize_text(" ".join(texts))
    return joined, "rapidocr-onnxruntime"


def jaccard_tokens(a: str, b: str) -> float:
    sa = set(a.split())
    sb = set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)
