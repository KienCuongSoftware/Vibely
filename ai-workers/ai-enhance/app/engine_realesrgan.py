"""Optional Real-ESRGAN via realesrgan-ncnn-vulkan CLI (production GPU path).

Set ENHANCE_ENGINE=realesrgan and ENHANCE_REALESRGAN_BIN to the binary path.
Falls through to callers on missing binary / failure.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path

from .engine_noop import probe_height, probe_width, target_height

LOG = logging.getLogger("ai_enhance.engine.realesrgan")


def _bin() -> str:
    configured = os.environ.get("ENHANCE_REALESRGAN_BIN", "").strip()
    if configured:
        return configured
    found = shutil.which("realesrgan-ncnn-vulkan")
    if found:
        return found
    raise FileNotFoundError(
        "realesrgan-ncnn-vulkan not found; set ENHANCE_REALESRGAN_BIN or install on PATH"
    )


def enhance_video(input_path: Path, output_path: Path, profile: str) -> tuple[int, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    src_h = probe_height(input_path)
    out_h = target_height(profile, src_h)
    # Real-ESRGAN typically x2/x4; we then scale to target with ffmpeg if needed.
    scale = 2 if out_h > src_h else 2
    model = os.environ.get("ENHANCE_REALESRGAN_MODEL", "realesrgan-x4plus")
    tmp_png_dir = output_path.parent / "realesrgan_frames"
    if tmp_png_dir.exists():
        shutil.rmtree(tmp_png_dir, ignore_errors=True)
    tmp_png_dir.mkdir(parents=True, exist_ok=True)

    # Extract → enhance stills → reassemble is heavy; for production MVP use
    # video-mode if binary supports -i/-o mp4, else frame pipeline is too slow.
    # Prefer direct video I/O when available.
    out_raw = output_path.parent / "realesrgan_raw.mp4"
    cmd = [
        _bin(),
        "-i",
        str(input_path),
        "-o",
        str(out_raw),
        "-n",
        model,
        "-s",
        str(scale),
        "-f",
        "mp4",
    ]
    LOG.info("Real-ESRGAN cmd=%s", " ".join(cmd))
    subprocess.check_call(cmd)

    if out_h != probe_height(out_raw):
        vf = f"scale=-2:{out_h}:flags=lanczos"
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(out_raw),
                "-vf",
                vf,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "18",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
                str(output_path),
            ]
        )
        out_raw.unlink(missing_ok=True)
    else:
        shutil.move(str(out_raw), str(output_path))

    shutil.rmtree(tmp_png_dir, ignore_errors=True)
    return probe_width(output_path), probe_height(output_path)
