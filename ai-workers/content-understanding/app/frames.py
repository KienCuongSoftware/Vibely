"""Uniform frame sampling via OpenCV — adapted from originality."""

from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np

LOG = logging.getLogger("content_understanding.frames")


def sample_frames(video_path: Path, count: int = 8) -> list[dict]:
    """
    Return list of {index, tMs, width, height, image (BGR ndarray)}.
    """
    count = max(1, min(int(count), 24))
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    if fps <= 1e-3:
        fps = 25.0

    if total <= 0:
        frames = _read_sequential(cap, count, fps)
    else:
        indices = np.linspace(0, max(total - 1, 0), num=count, dtype=int)
        frames = []
        for i, frame_idx in enumerate(indices.tolist()):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_idx))
            ok, image = cap.read()
            if not ok or image is None:
                continue
            t_ms = int((frame_idx / fps) * 1000)
            h, w = image.shape[:2]
            frames.append(
                {
                    "index": i,
                    "frameIndex": int(frame_idx),
                    "tMs": t_ms,
                    "width": int(w),
                    "height": int(h),
                    "image": image,
                }
            )
    cap.release()
    LOG.info("Sampled %s frames from %s", len(frames), video_path.name)
    return frames


def _read_sequential(cap: cv2.VideoCapture, count: int, fps: float) -> list[dict]:
    frames: list[dict] = []
    idx = 0
    while len(frames) < count:
        ok, image = cap.read()
        if not ok or image is None:
            break
        if idx % max(1, int(fps // 2) or 1) == 0:
            h, w = image.shape[:2]
            frames.append(
                {
                    "index": len(frames),
                    "frameIndex": idx,
                    "tMs": int((idx / fps) * 1000),
                    "width": int(w),
                    "height": int(h),
                    "image": image,
                }
            )
        idx += 1
    return frames
