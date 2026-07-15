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
    Adaptive hybrid sampling with hard cap for upload latency.

    ORIGINALITY_MAX_FRAMES (default 8) caps how many CLIP embeds we run — the
    dominant cost on CPU. Dense sampling still uses ffmpeg fps then downsamples.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    duration = max(0.1, float(duration_seconds))
    max_frames = max(2, int(os.environ.get("ORIGINALITY_MAX_FRAMES", "8")))

    if duration <= 10:
        fps = min(2.0, max_frames / max(duration, 0.5))
        strategy = f"dense_short_cap_{max_frames}"
    elif duration <= 60:
        fps = min(1.0, max_frames / max(duration, 1.0))
        strategy = f"uniform_cap_{max_frames}"
    else:
        fps = min(0.5, max_frames / duration)
        strategy = f"stride_cap_{max_frames}"

    pattern = str(out_dir / "frame_%05d.jpg")
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(video_path),
            "-vf",
            f"fps={fps:.4f},mpdecimate,scale=320:-2",
            "-q:v",
            "4",
            pattern,
        ],
        timeout=600,
    )
    frames = sorted(out_dir.glob("frame_*.jpg"))
    if len(frames) > max_frames:
        step = len(frames) / max_frames
        kept = [frames[int(i * step)] for i in range(max_frames)]
        for f in frames:
            if f not in kept:
                f.unlink(missing_ok=True)
        frames = kept
    if not frames:
        raise RuntimeError("No frames extracted from video")
    return frames, strategy
