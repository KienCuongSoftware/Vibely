"""Extract mono 16 kHz WAV from video via ffmpeg."""

from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path

LOG = logging.getLogger("content_understanding.audio_extract")


def extract_audio_wav(video_path: Path, wav_path: Path, max_seconds: int | None = 120) -> None:
    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(video_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
    ]
    if max_seconds and max_seconds > 0:
        cmd.extend(["-t", str(max_seconds)])
    cmd.append(str(wav_path))
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300, check=False)
    if proc.returncode != 0 or not wav_path.exists():
        raise RuntimeError(f"audio extract failed: {proc.stderr[-1500:]}")
