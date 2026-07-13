from __future__ import annotations

import os
import subprocess
from pathlib import Path


def run(cmd: list[str], timeout: int = 300) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(
            f"Command failed ({proc.returncode}): {' '.join(cmd)}\n{proc.stderr[-2000:]}"
        )


def probe_duration_seconds(video_path: Path) -> float:
    ffprobe = os.environ.get("FFPROBE_PATH", "ffprobe")
    proc = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {proc.stderr}")
    return float(proc.stdout.strip() or "0")


def extract_frames(video_path: Path, out_dir: Path, duration_seconds: float) -> tuple[list[Path], str]:
    """
    Adaptive hybrid sampling:
    - duration <= 10s  -> 2 fps, max 24 frames
    - duration <= 60s  -> 1 fps, max 60 frames
    - else             -> fps = min(1.0, 120/duration), max 120 frames
    Scene-change boost is approximated via ffmpeg mpdecimate after dense sample.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    duration = max(0.1, float(duration_seconds))
    if duration <= 10:
        fps = 2.0
        max_frames = 24
        strategy = "dense_2fps_short"
    elif duration <= 60:
        fps = 1.0
        max_frames = 60
        strategy = "uniform_1fps"
    else:
        fps = min(1.0, 120.0 / duration)
        max_frames = 120
        strategy = "stride_cap_120"

    pattern = str(out_dir / "frame_%05d.jpg")
    # Extract then keep first max_frames after mpdecimate removes near-duplicates.
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(video_path),
            "-vf",
            f"fps={fps},mpdecimate,scale=320:-2",
            "-q:v",
            "4",
            pattern,
        ],
        timeout=600,
    )
    frames = sorted(out_dir.glob("frame_*.jpg"))
    if len(frames) > max_frames:
        # Uniform keep across the list.
        step = len(frames) / max_frames
        kept = [frames[int(i * step)] for i in range(max_frames)]
        for f in frames:
            if f not in kept:
                f.unlink(missing_ok=True)
        frames = kept
    if not frames:
        raise RuntimeError("No frames extracted from video")
    return frames, strategy
