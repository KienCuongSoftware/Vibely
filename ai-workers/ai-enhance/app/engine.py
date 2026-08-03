"""Engine selection: noop (default) or realesrgan (optional binary)."""

from __future__ import annotations

import logging
import os

from . import engine_noop
from . import engine_realesrgan

LOG = logging.getLogger("ai_enhance.engine")


def enhance_video(input_path, output_path, profile: str) -> tuple[int, int]:
    name = (os.environ.get("ENHANCE_ENGINE") or os.environ.get("APP_ENHANCEMENT_ENGINE") or "noop").strip().lower()
    if name in ("realesrgan", "real-esrgan", "esrgan"):
        try:
            return engine_realesrgan.enhance_video(input_path, output_path, profile)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Real-ESRGAN failed (%s); falling back to noop", exc)
    return engine_noop.enhance_video(input_path, output_path, profile)


def model_meta() -> tuple[str, str]:
    name = (os.environ.get("ENHANCE_ENGINE") or os.environ.get("APP_ENHANCEMENT_ENGINE") or "noop").strip().lower()
    if name in ("realesrgan", "real-esrgan", "esrgan"):
        return "realesrgan-ncnn", os.environ.get("ENHANCE_REALESRGAN_VERSION", "1.0.0")
    return "noop-ffmpeg", "1.0.0"
