"""Whisper-small speech recognition (faster-whisper on CPU/GPU)."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from .audio_extract import extract_audio_wav
from .lexicon import match_lexicon, strip_accents

LOG = logging.getLogger("content_understanding.asr")

_WHISPER = None
_WHISPER_ID = None


def _load_whisper():
    global _WHISPER, _WHISPER_ID
    if _WHISPER is not None:
        return _WHISPER
    from faster_whisper import WhisperModel

    model_size = os.environ.get("CU_WHISPER_MODEL", "small")
    device = "cuda" if os.environ.get("CU_WHISPER_DEVICE") == "cuda" else "cpu"
    compute = os.environ.get("CU_WHISPER_COMPUTE", "int8" if device == "cpu" else "float16")
    _WHISPER = WhisperModel(model_size, device=device, compute_type=compute)
    _WHISPER_ID = f"faster-whisper:{model_size}:{device}:{compute}"
    LOG.info("Loaded Whisper %s", _WHISPER_ID)
    return _WHISPER


def transcribe_video(video_path: Path, work_dir: Path) -> dict[str, Any]:
    if os.environ.get("CU_WHISPER_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        return {
            "speechFeatures": {"note": "CU_WHISPER_ENABLED=false"},
            "speechTags": [],
            "modelId": "whisper:disabled",
        }

    wav_path = work_dir / "audio.wav"
    max_sec = int(os.environ.get("CU_WHISPER_MAX_SECONDS", "120"))
    try:
        extract_audio_wav(video_path, wav_path, max_seconds=max_sec)
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Audio extract failed: %s", exc)
        return {
            "speechFeatures": {"note": f"audio extract failed: {exc}"[:300]},
            "speechTags": [],
            "modelId": "whisper:skipped",
        }

    if not wav_path.exists() or wav_path.stat().st_size < 1000:
        return {
            "speechFeatures": {"note": "no audible track or empty wav"},
            "speechTags": [],
            "modelId": "whisper:empty",
        }

    try:
        model = _load_whisper()
        segments, info = model.transcribe(
            str(wav_path),
            vad_filter=True,
            beam_size=int(os.environ.get("CU_WHISPER_BEAM", "1")),
        )
        texts: list[dict[str, Any]] = []
        full_parts: list[str] = []
        for seg in segments:
            text = (seg.text or "").strip()
            if not text:
                continue
            full_parts.append(text)
            texts.append(
                {
                    "text": text,
                    "startMs": int(seg.start * 1000),
                    "endMs": int(seg.end * 1000),
                    "confidence": round(float(getattr(seg, "avg_logprob", 0) or 0), 3),
                }
            )

        transcript = " ".join(full_parts).strip()
        norm = strip_accents(transcript)
        speech_tags = match_lexicon(
            transcript,
            norm,
            source="speech",
            model_version=_WHISPER_ID or "faster-whisper",
        )
        for tag in speech_tags:
            tag["evidence"] = {**(tag.get("evidence") or {}), "transcriptSample": transcript[:240]}

        return {
            "speechFeatures": {
                "modelId": _WHISPER_ID,
                "language": getattr(info, "language", None),
                "languageProbability": round(float(getattr(info, "language_probability", 0) or 0), 3),
                "transcript": transcript[:4000],
                "segments": texts[:40],
                "segmentCount": len(texts),
            },
            "speechTags": speech_tags,
            "modelId": _WHISPER_ID or "faster-whisper",
        }
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Whisper failed: %s", exc)
        return {
            "speechFeatures": {"note": f"whisper error: {exc}"[:300]},
            "speechTags": [],
            "modelId": "whisper:error",
        }
