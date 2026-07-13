from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path

LOG = logging.getLogger("originality.audio")


def extract_audio_wav(video_path: Path, wav_path: Path) -> None:
    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    proc = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            str(wav_path),
        ],
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    if proc.returncode != 0 or not wav_path.exists():
        raise RuntimeError(f"audio extract failed: {proc.stderr[-1500:]}")


def chromaprint_fingerprint(video_path: Path) -> tuple[str | None, str]:
    """
    Returns (fingerprint_string_or_none, model_id).
    Uses fpcalc when installed; otherwise returns None.
    """
    fpcalc = os.environ.get("FPCALC_PATH", "fpcalc")
    try:
        proc = subprocess.run(
            [fpcalc, "-raw", "-length", "120", str(video_path)],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if proc.returncode != 0:
            LOG.warning("fpcalc failed: %s", proc.stderr[-500:])
            return None, "chromaprint:unavailable"
        fingerprint = None
        for line in proc.stdout.splitlines():
            if line.startswith("FINGERPRINT="):
                fingerprint = line.split("=", 1)[1].strip()
                break
        return fingerprint, "chromaprint:fpcalc"
    except FileNotFoundError:
        return None, "chromaprint:missing"


def fingerprint_similarity(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 0.0
    sa = set(a.split(","))
    sb = set(b.split(","))
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0
