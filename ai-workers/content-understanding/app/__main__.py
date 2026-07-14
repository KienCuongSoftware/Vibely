"""Vibely Content Understanding worker — Phase 1 + 1.1 (frames/OCR).

Transports:
  1) RabbitMQ cu.analyze (preferred when CU_RABBITMQ_ENABLED=true)
  2) HTTP poll /api/internal/content-understanding/claim (fallback)

Analysis:
  - metadata + hashtag lexicon → semantic tags
  - optional frame sample + RapidOCR → OCR features + lexicon boost
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import socket
import time
import unicodedata
from pathlib import Path
from typing import Any

import requests

from .download import download_video
from .frames import sample_frames
from .ocr import run_ocr_on_frames

LOG = logging.getLogger("content_understanding.worker")

HASHTAG_RE = re.compile(
    r"[#＃＠@]?([0-9A-Za-z_\u00C0-\u024F\u1E00-\u1EFF\u3040-\u30FF\u3400-\u9FFF]+)",
    re.UNICODE,
)

# slug -> keywords / aliases (lowercase, accent-stripped; CJK kept as-is)
LEXICON: dict[str, tuple[str, ...]] = {
    "anime": ("anime", "manga", "waifu", "naruto", "onepiece", "アニメ", "アニメーション"),
    "music": ("music", "lyrics", "song", "lofi", "amnhac", "nhac", "音楽"),
    "horror": ("horror", "ghost", "kinhdi", "ma", "creepy", "ホラー"),
    "gaming": ("gaming", "game", "valorant", "minecraft", "lol"),
    "food": ("food", "amthuc", "pho", "bun", "an uong"),
    "travel": ("travel", "dulich", "dalat", "beach", "mountain"),
    "comedy": ("comedy", "funny", "haihuoc", "meme"),
    "education": ("education", "hoc", "tutorial", "coding", "java", "spring"),
    "night": ("night", "dem", "midnight"),
    "sad": ("sad", "buon", "buồn"),
    "lofi": ("lofi", "chill"),
    "lyrics": ("lyrics", "loi bai hat"),
    "coding": ("coding", "laptrinh", "docker", "postgresql"),
    "cat": ("cat", "meo", "mèo"),
    "dog": ("dog", "cho", "chó"),
    "rain": ("rain", "mua", "mưa"),
    "city": ("city", "thanh pho", "saigon", "hanoi"),
}


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()


def _match_lexicon(blob_raw: str, blob_norm: str, source: str, model_version: str) -> list[dict[str, Any]]:
    tags: list[dict[str, Any]] = []
    matched: list[str] = []

    for slug, keywords in LEXICON.items():
        hits = [kw for kw in keywords if kw in blob_norm or kw in blob_raw]
        if not hits:
            continue
        conf = min(0.95, 0.55 + 0.08 * len(hits))
        tags.append(
            {
                "slug": slug,
                "confidence": round(conf, 3),
                "source": source,
                "modelVersion": model_version,
                "reason": f"keyword hit: {', '.join(hits[:5])}",
                "evidence": {"field": source, "hits": hits[:5]},
            }
        )
        matched.append(slug)

    for raw in HASHTAG_RE.findall(blob_raw):
        key = strip_accents(raw)
        raw_key = raw.strip()
        for slug, keywords in LEXICON.items():
            if key == slug or key in keywords or raw_key in keywords or raw_key == slug:
                if slug in matched:
                    for t in tags:
                        if t["slug"] == slug:
                            t["confidence"] = max(float(t["confidence"]), 0.92)
                            t["reason"] = f"{t['reason']}; hashtag #{raw}"
                    continue
                tags.append(
                    {
                        "slug": slug,
                        "confidence": 0.92,
                        "source": source,
                        "modelVersion": model_version,
                        "reason": f"hashtag #{raw}",
                        "evidence": {"hashtag": raw},
                    }
                )
                matched.append(slug)

    return tags


def _merge_tags(base: list[dict[str, Any]], extra: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_slug: dict[str, dict[str, Any]] = {t["slug"]: dict(t) for t in base}
    for item in extra:
        slug = item["slug"]
        if slug not in by_slug:
            by_slug[slug] = dict(item)
            continue
        cur = by_slug[slug]
        cur["confidence"] = round(max(float(cur["confidence"]), float(item["confidence"])), 3)
        cur["reason"] = f"{cur['reason']}; {item['reason']}"
        # prefer richer source label when OCR boosts metadata
        if item.get("source") == "ocr" and cur.get("source") == "metadata":
            cur["source"] = "fusion"
        elif cur.get("source") != item.get("source"):
            cur["source"] = "fusion"
    return list(by_slug.values())


def analyze_metadata(claim: dict[str, Any]) -> dict[str, Any]:
    title = str(claim.get("title") or "")
    description = str(claim.get("description") or "")
    audio = str(claim.get("audioTitle") or "")
    raw_blob = f"{title}\n{description}\n{audio}"
    blob = strip_accents(raw_blob)
    tags = _match_lexicon(raw_blob, blob, source="metadata", model_version="metadata-lexicon-phase1-v1")
    return {
        "semanticTags": tags,
        "metadataFeatures": {
            "title": title,
            "description": description,
            "audioTitle": audio,
            "matchedSlugs": [t["slug"] for t in tags],
        },
    }


def analyze_frames_ocr(claim: dict[str, Any]) -> dict[str, Any]:
    """Phase 1.1 — download → sample frames → OCR → lexicon on OCR text."""
    video_url = claim.get("videoUrl") or claim.get("video_url")
    if not video_url:
        return {
            "ocrFeatures": {"texts": [], "note": "missing videoUrl"},
            "ocrTags": [],
            "metrics": {"stage": "ocr_skipped", "reason": "no_url"},
        }

    if os.environ.get("CU_FRAMES_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        return {
            "ocrFeatures": {"texts": [], "note": "CU_FRAMES_ENABLED=false"},
            "ocrTags": [],
            "metrics": {"stage": "ocr_skipped", "reason": "frames_disabled"},
        }

    work_root = Path(os.environ.get("CU_WORK_DIR", "/tmp/cu-work"))
    job_dir = work_root / str(claim.get("jobId") or claim.get("videoId") or "job")
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = job_dir / "source.bin"
    frame_count = int(os.environ.get("CU_FRAME_COUNT", "8"))

    try:
        download_video(str(video_url), video_path)
        frames = sample_frames(video_path, count=frame_count)
        ocr_features = run_ocr_on_frames(frames)
        ocr_blob = "\n".join(t["text"] for t in ocr_features.get("texts") or [])
        ocr_tags = _match_lexicon(
            ocr_blob,
            strip_accents(ocr_blob),
            source="ocr",
            model_version="ocr-lexicon-phase1.1-v1",
        )
        # evidence: attach sample OCR hits (no image bytes)
        for tag in ocr_tags:
            tag["evidence"] = {
                **(tag.get("evidence") or {}),
                "ocrSample": [t["text"] for t in (ocr_features.get("texts") or [])[:8]],
            }
        return {
            "ocrFeatures": {
                "texts": ocr_features.get("texts") or [],
                "note": ocr_features.get("note"),
                "engine": ocr_features.get("engine"),
                "frameCount": len(frames),
                "frameMeta": [
                    {
                        "index": f.get("index"),
                        "frameIndex": f.get("frameIndex"),
                        "tMs": f.get("tMs"),
                        "width": f.get("width"),
                        "height": f.get("height"),
                    }
                    for f in frames
                ],
            },
            "ocrTags": ocr_tags,
            "metrics": {
                "stage": "frames_ocr",
                "frameCount": len(frames),
                "ocrTextCount": len(ocr_features.get("texts") or []),
                "ocrTagCount": len(ocr_tags),
            },
        }
    except Exception as exc:  # noqa: BLE001
        LOG.exception("Frame/OCR stage failed videoId=%s", claim.get("videoId"))
        return {
            "ocrFeatures": {"texts": [], "note": f"frame/ocr error: {exc}"[:500]},
            "ocrTags": [],
            "metrics": {"stage": "ocr_error", "error": str(exc)[:200]},
        }
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


def analyze(claim: dict[str, Any]) -> dict[str, Any]:
    meta = analyze_metadata(claim)
    vision = analyze_frames_ocr(claim)
    tags = _merge_tags(meta["semanticTags"], vision.get("ocrTags") or [])
    metrics = {
        "tagCount": len(tags),
        "stage": "metadata+frames_ocr",
        **(vision.get("metrics") or {}),
    }
    return {
        "semanticTags": tags,
        "metadataFeatures": meta["metadataFeatures"],
        "ocrFeatures": vision.get("ocrFeatures") or {"texts": [], "note": "none"},
        "featureVersion": "cu-phase1.1",
        "metrics": metrics,
    }


def claim_and_run(base: str, headers: dict[str, str], job_id: str | None = None) -> bool:
    if job_id:
        resp = requests.post(
            f"{base}/api/internal/content-understanding/jobs/{job_id}/claim",
            headers=headers,
            timeout=30,
        )
    else:
        resp = requests.post(
            f"{base}/api/internal/content-understanding/claim",
            headers=headers,
            timeout=30,
        )
    if resp.status_code == 204:
        return False
    resp.raise_for_status()
    body = resp.json()
    data = body.get("data") or body
    jid = data["jobId"]
    LOG.info("Claimed jobId=%s videoId=%s", jid, data.get("videoId"))
    try:
        payload = analyze(data)
        done = requests.post(
            f"{base}/api/internal/content-understanding/jobs/{jid}/complete",
            headers=headers,
            json=payload,
            timeout=120,
        )
        done.raise_for_status()
        LOG.info(
            "Completed jobId=%s tags=%s ocrTexts=%s",
            jid,
            len(payload["semanticTags"]),
            len((payload.get("ocrFeatures") or {}).get("texts") or []),
        )
    except Exception as exc:  # noqa: BLE001
        LOG.exception("Job failed jobId=%s", jid)
        requests.post(
            f"{base}/api/internal/content-understanding/jobs/{jid}/fail",
            headers=headers,
            json={"errorMessage": str(exc)[:1900]},
            timeout=30,
        )
    return True


def rabbit_loop(base: str, headers: dict[str, str]) -> None:
    import pika

    url = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@127.0.0.1:5672/%2F")
    queue = os.environ.get("CU_QUEUE_ANALYZE", "cu.analyze")
    params = pika.URLParameters(url)
    while True:
        try:
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue=queue, durable=True)
            LOG.info("RabbitMQ consuming queue=%s", queue)

            def on_message(ch, method, properties, body):  # noqa: ANN001
                job_id = None
                try:
                    payload = json.loads(body.decode("utf-8"))
                    job_id = payload.get("jobId")
                except Exception:  # noqa: BLE001
                    LOG.warning("Invalid CU message body")
                claim_and_run(base, headers, job_id=job_id)
                ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=queue, on_message_callback=on_message)
            channel.start_consuming()
        except Exception as exc:  # noqa: BLE001
            LOG.warning("RabbitMQ loop error: %s — fallback sleep", exc)
            time.sleep(5)


def poll_loop(base: str, headers: dict[str, str], poll_seconds: float) -> None:
    LOG.info("CU poll loop api=%s interval=%ss", base, poll_seconds)
    while True:
        try:
            worked = claim_and_run(base, headers)
            if not worked:
                time.sleep(poll_seconds)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Claim loop error: %s", exc)
            time.sleep(poll_seconds)


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    base = env("VIBELY_API_BASE", "http://127.0.0.1:8080").rstrip("/")
    token = env("CU_INTERNAL_TOKEN", "vibely-dev-cu-token")
    worker_id = os.environ.get("CU_WORKER_ID") or f"cu-{socket.gethostname()}"
    headers = {
        "X-Internal-Token": token,
        "X-Worker-Id": worker_id,
        "Content-Type": "application/json",
    }
    rabbit_enabled = os.environ.get("CU_RABBITMQ_ENABLED", "false").lower() in {"1", "true", "yes"}
    poll_seconds = float(os.environ.get("CU_POLL_SECONDS", "3"))
    LOG.info(
        "Content Understanding worker started api=%s rabbit=%s frames=%s ocr=%s",
        base,
        rabbit_enabled,
        os.environ.get("CU_FRAMES_ENABLED", "true"),
        os.environ.get("CU_OCR_ENABLED", "true"),
    )
    if rabbit_enabled:
        rabbit_loop(base, headers)
    else:
        poll_loop(base, headers, poll_seconds)


if __name__ == "__main__":
    main()
