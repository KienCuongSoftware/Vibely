"""
Vibely originality worker.

Transport: poll Spring internal claim API (Postgres SKIP LOCKED).
Signals: OpenCLIP visual embeddings + pHash, Chromaprint audio, PaddleOCR text,
corner OCR watermark keywords, Qdrant HNSW ANN.
Scoring weights are fixed in scoring.py (policy v1).
"""

from __future__ import annotations

import logging
import os
import tempfile
import time
from pathlib import Path

import requests

from .embed import warm_clip
from .pipeline import analyze_video
from .qdrant_store import VectorStore
from .scoring import build_complete_payload

LOG = logging.getLogger("originality.worker")


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name)
    if value is None or value == "":
        if default is not None and default != "":
            return default
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    base = env("VIBELY_API_BASE", "http://127.0.0.1:8080").rstrip("/")
    token = env("ORIGINALITY_INTERNAL_TOKEN", "vibely-dev-originality-token")
    poll_seconds = float(os.environ.get("ORIGINALITY_POLL_SECONDS", "3"))
    headers = {"X-Internal-Token": token, "Content-Type": "application/json"}

    LOG.info(
        "Originality worker started api=%s max_frames=%s ocr=%s watermark=%s",
        base,
        os.environ.get("ORIGINALITY_MAX_FRAMES", "8"),
        os.environ.get("ORIGINALITY_OCR_ENABLED", "false"),
        os.environ.get("ORIGINALITY_WATERMARK_ENABLED", "true"),
    )
    if os.environ.get("ORIGINALITY_WARM_ON_START", "true").lower() in {"1", "true", "yes"}:
        warm_clip()
        VectorStore().warm()
    while True:
        try:
            claim = requests.post(f"{base}/api/internal/originality/claim", headers=headers, timeout=30)
            if claim.status_code == 204:
                time.sleep(poll_seconds)
                continue
            claim.raise_for_status()
            body = claim.json()
            data = body.get("data") or body
            job_id = int(data["jobId"])
            LOG.info("Claimed jobId=%s videoId=%s", job_id, data.get("videoId"))
            work_dir = Path(tempfile.mkdtemp(prefix=f"orig-{job_id}-"))
            try:
                analysis = analyze_video(data, work_dir)
                payload = build_complete_payload(analysis)
                done = requests.post(
                    f"{base}/api/internal/originality/{job_id}/complete",
                    headers=headers,
                    json=payload,
                    timeout=60,
                )
                done.raise_for_status()
                LOG.info(
                    "Completed jobId=%s decision=%s originality=%.2f",
                    job_id,
                    payload["decision"],
                    payload["originalityScore"],
                )
            except Exception as exc:  # noqa: BLE001 — fail job and continue loop
                LOG.exception("Job failed jobId=%s", job_id)
                requests.post(
                    f"{base}/api/internal/originality/{job_id}/fail",
                    headers=headers,
                    json={"errorMessage": str(exc)[:1900]},
                    timeout=30,
                )
            finally:
                # Best-effort cleanup handled by OS tmp; keep frames only during job.
                pass
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Claim loop error: %s", exc)
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
