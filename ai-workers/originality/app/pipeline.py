from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import numpy as np

from .audio import chromaprint_fingerprint
from .download import download_video
from .embed import embed_frames, mean_pool, phash64
from .frames import extract_frames, probe_duration_seconds
from .metadata_signals import score_metadata_hints
from .ocr import ocr_frames
from .qdrant_store import VectorStore
from .watermark import detect_platform_watermark

LOG = logging.getLogger("originality.pipeline")


def _env_flag(name: str, default: str = "false") -> bool:
    return os.environ.get(name, default).lower() in {"1", "true", "yes"}


def analyze_video(claim: dict[str, Any], work_dir: Path) -> dict[str, Any]:
    video_id = int(claim["videoId"])
    public_id = str(claim["videoPublicId"])
    video_url = str(claim["videoUrl"])
    duration_hint = claim.get("durationSeconds")

    source = work_dir / "source.bin"
    download_video(video_url, source)
    # Rename with extension for ffmpeg when possible
    video_path = source
    if ".mp4" in video_url.lower():
        video_path = work_dir / "source.mp4"
        source.rename(video_path)
    elif ".webm" in video_url.lower():
        video_path = work_dir / "source.webm"
        source.rename(video_path)
    elif ".mov" in video_url.lower():
        video_path = work_dir / "source.mov"
        source.rename(video_path)

    duration = float(duration_hint) if duration_hint else probe_duration_seconds(video_path)
    if duration <= 0:
        duration = probe_duration_seconds(video_path)

    frames_dir = work_dir / "frames"
    frames, strategy = extract_frames(video_path, frames_dir, duration)
    vectors, clip_model = embed_frames(frames)
    store = VectorStore()
    neighbors = store.search_similar(vectors, exclude_video_id=video_id, top_k=30)

    visual_score = 0.0
    matched_video_id = None
    visual_explain: list[dict[str, Any]] = []
    if neighbors:
        # Aggregate by video_id: take max score among neighbors.
        best_by_video: dict[int, float] = {}
        for n in neighbors:
            vid = n.get("video_id")
            if vid is None:
                continue
            vid = int(vid)
            best_by_video[vid] = max(best_by_video.get(vid, 0.0), float(n["score"]))
        matched_video_id, visual_score = max(best_by_video.items(), key=lambda kv: kv[1])
        visual_explain = [
            {
                "matchedVideoId": n.get("video_id"),
                "frameIndex": n.get("frame_index"),
                "cosine": n.get("score"),
            }
            for n in neighbors[:8]
        ]
    else:
        # Cold start corpus: self pHash consistency is not a match; score 0.
        visual_score = 0.0

    # Upsert after search so we do not match ourselves.
    store.upsert_video_vectors(video_id, public_id, vectors, duration)

    # Full-frame OCR is expensive and weak on cold corpus — off by default for upload latency.
    if _env_flag("ORIGINALITY_OCR_ENABLED", "false"):
        ocr_text, ocr_model = ocr_frames(frames)
    else:
        ocr_text, ocr_model = "", "ocr:skipped"
    ocr_score = 0.0
    ocr_explain = {"textPreview": ocr_text[:500], "tokenCount": len(ocr_text.split())}
    if matched_video_id is not None and ocr_text:
        ocr_score = min(0.35, len(set(ocr_text.split())) / 200.0)

    fp, audio_model = chromaprint_fingerprint(video_path)
    audio_score = 0.0
    audio_explain = {"fingerprintPresent": bool(fp), "model": audio_model}

    if _env_flag("ORIGINALITY_WATERMARK_ENABLED", "true"):
        wm_max = max(1, int(os.environ.get("ORIGINALITY_WATERMARK_MAX_FRAMES", "3")))
        wm_score, wm_explain, wm_model = detect_platform_watermark(frames, max_frames=wm_max)
    else:
        wm_score, wm_explain, wm_model = 0.0, {"labels": [], "hits": 0, "note": "skipped"}, "watermark:skipped"

    # Metadata: downloader filename/title hints + duration collision with neighbor.
    hint_score, hint_explain = score_metadata_hints(
        video_url=video_url,
        title=str(claim.get("title") or ""),
        description=str(claim.get("description") or ""),
    )
    metadata_score = float(hint_score)
    metadata_explain = {"durationSeconds": duration, **hint_explain}
    if matched_video_id is not None and visual_score >= 0.80:
        metadata_score = max(metadata_score, 0.45)

    scene_score = float(np.clip(visual_score * 0.85, 0.0, 1.0))

    matches = []
    if matched_video_id is not None and visual_score > 0.01:
        matches.append(
            {
                "matchedVideoId": matched_video_id,
                "modality": "VISUAL",
                "score": float(visual_score),
                "detailJson": "{\"source\":\"qdrant_hnsw\"}",
            }
        )
    if wm_score >= 0.25:
        matches.append(
            {
                "matchedVideoId": int(matched_video_id) if matched_video_id is not None else video_id,
                "modality": "WATERMARK",
                "score": float(wm_score),
                "detailJson": "{\"source\":\"corner_ocr\"}",
            }
        )
    if hint_score >= 0.85:
        matches.append(
            {
                "matchedVideoId": video_id,
                "modality": "METADATA",
                "score": float(hint_score),
                "detailJson": "{\"source\":\"downloader_filename\"}",
            }
        )

    return {
        "signals": {
            "visual_similarity": float(visual_score),
            "audio_similarity": float(audio_score),
            "ocr_similarity": float(ocr_score),
            "watermark_score": float(wm_score),
            "metadata_score": float(metadata_score),
            "scene_object_score": float(scene_score),
        },
        "matched_video_id": matched_video_id,
        "visual_explain": visual_explain,
        "audio_explain": audio_explain,
        "ocr_explain": ocr_explain,
        "watermark_explain": wm_explain,
        "metadata_explain": metadata_explain,
        "frame_count": len(frames),
        "sample_strategy": strategy,
        "model_versions": {
            "clip": clip_model,
            "ocr": ocr_model,
            "audio": audio_model,
            "watermark": wm_model,
            "policy": "v1",
        },
        "matches": matches,
        "mean_vector_dim": int(mean_pool(vectors).shape[0]),
        "self_phash": phash64(frames[len(frames) // 2]),
    }
