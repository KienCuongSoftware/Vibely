"""
Vibely content-moderation worker.

Loads CU + originality snapshot from Spring claim API, evaluates DB-backed rules,
posts explainable decision. Never re-runs OCR/Whisper/CLIP/YOLO.
"""

from __future__ import annotations

import logging
import os
import time

import requests

from .engine import evaluate

LOG = logging.getLogger("moderation.worker")


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    base = env("VIBELY_API_BASE", "http://127.0.0.1:8080").rstrip("/")
    token = env("MODERATION_INTERNAL_TOKEN", "vibely-dev-moderation-token")
    poll_seconds = float(os.environ.get("MODERATION_POLL_SECONDS", "3"))
    headers = {"X-Internal-Token": token, "Content-Type": "application/json"}

    LOG.info("Content-moderation worker started api=%s", base)
    while True:
        try:
            claim = requests.post(
                f"{base}/api/internal/moderation/claim",
                headers=headers,
                timeout=30,
            )
            if claim.status_code == 204:
                time.sleep(poll_seconds)
                continue
            claim.raise_for_status()
            body = claim.json()
            data = body.get("data") or body
            job_id = int(data["jobId"])
            LOG.info(
                "Claimed jobId=%s videoId=%s policy=%s",
                job_id,
                data.get("videoId"),
                data.get("policyVersion"),
            )
            try:
                payload = evaluate(data)
                done = requests.post(
                    f"{base}/api/internal/moderation/jobs/{job_id}/complete",
                    headers=headers,
                    json=payload,
                    timeout=60,
                )
                done.raise_for_status()
                LOG.info(
                    "Completed jobId=%s decision=%s risk=%s confidence=%.2f",
                    job_id,
                    payload["decision"],
                    payload["risk"],
                    payload["confidence"],
                )
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Job failed jobId=%s", job_id)
                requests.post(
                    f"{base}/api/internal/moderation/jobs/{job_id}/fail",
                    headers=headers,
                    json={"errorMessage": str(exc)[:1900]},
                    timeout=30,
                )
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Claim loop error: %s", exc)
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
