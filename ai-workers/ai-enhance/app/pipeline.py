"""Enhancement pipeline steps (MVP)."""

from __future__ import annotations

import logging
from pathlib import Path

import requests

from .download import download_video
from .engine import enhance_video, model_meta
from .hls import generate_hls
from .s3_upload import upload_dir

LOG = logging.getLogger("ai_enhance.pipeline")


def _progress(base: str, headers: dict, job_id: str, pct: int, stage: str, detail: str = "", state: str | None = None) -> None:
    body = {
        "progressPct": pct,
        "progressStage": stage,
        "progressDetail": detail,
    }
    if state:
        body["state"] = state
    try:
        requests.post(
            f"{base}/api/internal/enhancement/jobs/{job_id}/progress",
            headers=headers,
            json=body,
            timeout=15,
        )
    except Exception as exc:  # noqa: BLE001
        LOG.warning("progress update failed: %s", exc)


def run_enhancement_pipeline(claim: dict, work_root: Path, api_base: str, headers: dict) -> dict:
    job_id = claim["jobId"]
    video_url = claim["videoUrl"]
    profile = claim.get("targetProfile") or "ENHANCE_NATIVE"
    author_id = claim.get("authorId")
    public_id = claim.get("videoPublicId")
    if not author_id or not public_id:
        raise RuntimeError("claim missing authorId/videoPublicId")

    download_dir = work_root / "download"
    enhanced_dir = work_root / "enhanced"
    hls_dir = work_root / "hls"
    download_dir.mkdir(parents=True, exist_ok=True)
    enhanced_dir.mkdir(parents=True, exist_ok=True)

    _progress(api_base, headers, job_id, 5, "DOWNLOAD", state="DOWNLOADING")
    src = download_video(video_url, download_dir / "original.mp4")

    model_name, model_version = model_meta()
    _progress(api_base, headers, job_id, 20, "AI_PROCESSING", model_name, state="AI_PROCESSING")
    out_mp4 = enhanced_dir / "enhanced.mp4"
    width, height = enhance_video(src, out_mp4, profile)

    _progress(api_base, headers, job_id, 70, "GENERATING_HLS", state="GENERATING_HLS")
    generate_hls(out_mp4, hls_dir, height)

    profile_slug = profile.lower()
    storage_prefix = f"hls/{author_id}/{public_id}/enhanced/{profile_slug}"
    _progress(api_base, headers, job_id, 85, "UPLOADING", storage_prefix, state="UPLOADING")
    master_url = upload_dir(hls_dir, storage_prefix)

    return {
        "masterPlaylistUrl": master_url,
        "storagePrefix": storage_prefix + "/",
        "widthPx": width,
        "heightPx": height,
        "label": _label(profile),
        "modelName": model_name,
        "modelVersion": model_version,
    }


def _label(profile: str) -> str:
    return {
        "AI_1080": "1080p AI",
        "AI_1440": "1440p AI",
        "AI_2160": "2160p AI",
    }.get((profile or "").upper(), "AI Enhanced")
