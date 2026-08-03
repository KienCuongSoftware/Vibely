"""Noop / FFmpeg-based enhancement engine (swappable later for Real-ESRGAN etc.)."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

LOG = logging.getLogger("ai_enhance.engine.noop")


def probe_height(path: Path) -> int:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=height",
        "-of",
        "csv=p=0",
        str(path),
    ]
    out = subprocess.check_output(cmd, text=True).strip().splitlines()[0]
    return int(float(out))


def target_height(profile: str, source_h: int) -> int:
    profile = (profile or "ENHANCE_NATIVE").upper()
    max_factor = 2.0
    if profile == "AI_1080":
        desired = 1080
    elif profile == "AI_1440":
        desired = 1440
    elif profile == "AI_2160":
        desired = 2160
    else:
        return source_h
    if desired <= source_h:
        return source_h
    capped = int(source_h * max_factor)
    return min(desired, capped, 2160)


def enhance_video(input_path: Path, output_path: Path, profile: str) -> tuple[int, int]:
    """Light unsharp + optional upscale. Replace with EnhancementEngine later."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    src_h = probe_height(input_path)
    out_h = target_height(profile, src_h)
    if out_h != src_h:
        vf = f"scale=-2:{out_h}:flags=lanczos,unsharp=5:5:0.8:5:5:0.0"
    else:
        vf = "unsharp=5:5:0.6:5:5:0.0"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    LOG.info("Running enhance profile=%s src_h=%s out_h=%s", profile, src_h, out_h)
    subprocess.check_call(cmd)
    return probe_width(output_path), out_h


def probe_width(path: Path) -> int:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width",
        "-of",
        "csv=p=0",
        str(path),
    ]
    out = subprocess.check_output(cmd, text=True).strip().splitlines()[0]
    return int(float(out))
