"""Unified CU analysis pipeline — Phase 2 complete (CLIP / Whisper / YOLO / fusion / Qdrant)."""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
from pathlib import Path
from typing import Any

from .asr import transcribe_video
from .clip_vision import analyze_visual, mean_pool
from .download import download_video
from .frames import sample_frames
from .fusion import fuse_tags
from .lexicon import match_lexicon, strip_accents
from .ocr import run_ocr_on_frames
from .qdrant_cu import CuVectorStore
from .yolo_detect import analyze_objects

LOG = logging.getLogger("content_understanding.pipeline")


def analyze_metadata(claim: dict[str, Any]) -> dict[str, Any]:
    title = str(claim.get("title") or "")
    description = str(claim.get("description") or "")
    audio = str(claim.get("audioTitle") or "")
    raw_blob = f"{title}\n{description}\n{audio}"
    tags = match_lexicon(
        raw_blob,
        strip_accents(raw_blob),
        source="metadata",
        model_version="metadata-lexicon-phase1-v1",
    )
    return {
        "metadataTags": tags,
        "metadataFeatures": {
            "title": title,
            "description": description,
            "audioTitle": audio,
            "matchedSlugs": [t["slug"] for t in tags],
        },
    }


def analyze(claim: dict[str, Any]) -> dict[str, Any]:
    meta = analyze_metadata(claim)
    video_url = claim.get("videoUrl") or claim.get("video_url")

    ocr_features: dict[str, Any] = {"texts": [], "note": "skipped"}
    visual_features: dict[str, Any] = {"note": "skipped"}
    speech_features: dict[str, Any] = {"note": "skipped"}
    audio_features: dict[str, Any] = {"note": "skipped"}
    object_features: dict[str, Any] = {"note": "skipped"}
    scene_features: dict[str, Any] = {"note": "skipped"}
    ocr_tags: list[dict[str, Any]] = []
    visual_tags: list[dict[str, Any]] = []
    speech_tags: list[dict[str, Any]] = []
    object_tags: list[dict[str, Any]] = []
    scene_tags: list[dict[str, Any]] = []
    qdrant_info: dict[str, Any] = {"note": "skipped"}
    content_sha256: str | None = None
    metrics: dict[str, Any] = {"stage": "metadata_only"}

    if not video_url:
        tags = fuse_tags(meta["metadataTags"])
        return _build_payload(
            claim,
            tags,
            meta["metadataFeatures"],
            ocr_features,
            visual_features,
            speech_features,
            audio_features,
            object_features,
            scene_features,
            content_sha256,
            metrics,
            qdrant_info,
        )

    if os.environ.get("CU_FRAMES_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        tags = fuse_tags(meta["metadataTags"])
        metrics = {"stage": "metadata", "framesDisabled": True}
        return _build_payload(
            claim,
            tags,
            meta["metadataFeatures"],
            ocr_features,
            visual_features,
            speech_features,
            audio_features,
            object_features,
            scene_features,
            content_sha256,
            metrics,
            qdrant_info,
        )

    work_root = Path(os.environ.get("CU_WORK_DIR", "/tmp/cu-work"))
    job_dir = work_root / str(claim.get("jobId") or claim.get("videoId") or "job")
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = job_dir / "source.bin"
    frame_count = int(os.environ.get("CU_FRAME_COUNT", "8"))

    try:
        download_video(str(video_url), video_path)
        content_sha256 = hashlib.sha256(video_path.read_bytes()).hexdigest()
        frames = sample_frames(video_path, count=frame_count)
        frame_meta = [
            {
                "index": f.get("index"),
                "frameIndex": f.get("frameIndex"),
                "tMs": f.get("tMs"),
                "width": f.get("width"),
                "height": f.get("height"),
            }
            for f in frames
        ]

        # Phase 1.1 — OCR
        if os.environ.get("CU_OCR_ENABLED", "true").lower() in {"1", "true", "yes"}:
            ocr_raw = run_ocr_on_frames(frames)
            ocr_blob = "\n".join(t["text"] for t in ocr_raw.get("texts") or [])
            ocr_tags = match_lexicon(
                ocr_blob,
                strip_accents(ocr_blob),
                source="ocr",
                model_version="ocr-lexicon-phase1.1-v1",
            )
            ocr_features = {
                "texts": ocr_raw.get("texts") or [],
                "note": ocr_raw.get("note"),
                "engine": ocr_raw.get("engine"),
                "frameCount": len(frames),
                "frameMeta": frame_meta,
            }

        # Phase 2 — CLIP visual
        visual = analyze_visual(frames)
        visual_tags = visual.get("visualTags") or []
        visual_features = visual.get("visualFeatures") or {}
        frame_vectors = visual.get("frameVectors")
        video_mean = mean_pool(frame_vectors) if frame_vectors is not None else None

        # Phase 2 — YOLO lite
        yolo = analyze_objects(frames)
        object_tags = yolo.get("objectTags") or []
        scene_tags = yolo.get("sceneTags") or []
        object_features = yolo.get("objectFeatures") or {"note": "empty"}
        scene_features = yolo.get("sceneFeatures") or {"note": "empty"}
        if "sceneTags" in scene_features:
            scene_features = {k: v for k, v in scene_features.items() if k != "sceneTags"}

        # Phase 2 — Whisper ASR
        asr = transcribe_video(video_path, job_dir)
        speech_tags = asr.get("speechTags") or []
        speech_features = asr.get("speechFeatures") or {}
        audio_features = {
            "modelId": asr.get("modelId"),
            "hasTranscript": bool((speech_features.get("transcript") or "").strip()),
        }

        tags = fuse_tags(
            meta["metadataTags"],
            ocr_tags,
            visual_tags,
            speech_tags,
            object_tags,
            scene_tags,
        )

        # Phase 2 — Qdrant embeddings
        if frame_vectors is not None and frame_vectors.size > 0 and video_mean is not None:
            store = CuVectorStore()
            qdrant_info = store.upsert_video(
                video_id=int(claim.get("videoId") or 0),
                public_id=str(claim.get("videoPublicId") or claim.get("publicId") or ""),
                frame_vectors=frame_vectors,
                video_mean=video_mean,
                model_id=str(visual.get("modelId") or "clip"),
                top_tag_slugs=[t["slug"] for t in tags[:12]],
                frame_meta=frame_meta,
            )

        metrics = {
            "stage": "phase2_multimodal",
            "frameCount": len(frames),
            "ocrTextCount": len(ocr_features.get("texts") or []),
            "visualTagCount": len(visual_tags),
            "speechTagCount": len(speech_tags),
            "objectTagCount": len(object_tags),
            "sceneTagCount": len(scene_tags),
            "tagCount": len(tags),
            "fusion": "late_weighted_v1",
            "qdrantFramePoints": qdrant_info.get("framePoints", 0),
            "yoloModel": yolo.get("modelId"),
        }
    except Exception as exc:  # noqa: BLE001
        LOG.exception("Pipeline failed videoId=%s", claim.get("videoId"))
        tags = fuse_tags(meta["metadataTags"])
        ocr_features = {"texts": [], "note": f"pipeline error: {exc}"[:500]}
        metrics = {"stage": "pipeline_error", "error": str(exc)[:200]}
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)

    return _build_payload(
        claim,
        tags,
        meta["metadataFeatures"],
        ocr_features,
        visual_features,
        speech_features,
        audio_features,
        object_features,
        scene_features,
        content_sha256,
        metrics,
        qdrant_info,
    )


def _build_payload(
    claim: dict[str, Any],
    tags: list[dict[str, Any]],
    metadata_features: dict[str, Any],
    ocr_features: dict[str, Any],
    visual_features: dict[str, Any],
    speech_features: dict[str, Any],
    audio_features: dict[str, Any],
    object_features: dict[str, Any],
    scene_features: dict[str, Any],
    content_sha256: str | None,
    metrics: dict[str, Any],
    qdrant_info: dict[str, Any],
) -> dict[str, Any]:
    if qdrant_info:
        visual_features = {**visual_features, "qdrant": qdrant_info}
    return {
        "semanticTags": tags,
        "metadataFeatures": metadata_features,
        "ocrFeatures": ocr_features,
        "visualFeatures": visual_features,
        "speechFeatures": speech_features,
        "audioFeatures": audio_features,
        "objectFeatures": object_features,
        "sceneFeatures": scene_features,
        "contentSha256": content_sha256,
        "featureVersion": "cu-phase2.1",
        "metrics": metrics,
    }
