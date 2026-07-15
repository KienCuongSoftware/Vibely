"""Vibely Content Understanding worker — Phase 2 (CLIP + Whisper + Qdrant)."""

from __future__ import annotations

import json
import logging
import os
import socket
import time

import requests

from .pipeline import analyze

LOG = logging.getLogger("content_understanding.worker")


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value


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
            timeout=int(os.environ.get("CU_COMPLETE_TIMEOUT", "600")),
        )
        done.raise_for_status()
        LOG.info(
            "Completed jobId=%s tags=%s sha=%s qdrant=%s",
            jid,
            len(payload["semanticTags"]),
            (payload.get("contentSha256") or "")[:12],
            ((payload.get("visualFeatures") or {}).get("qdrant") or {}).get("framePoints"),
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
        "CU worker phase2.1 api=%s rabbit=%s clip=%s whisper=%s yolo=%s qdrant=%s",
        base,
        rabbit_enabled,
        os.environ.get("CU_CLIP_ENABLED", "true"),
        os.environ.get("CU_WHISPER_ENABLED", "true"),
        os.environ.get("CU_YOLO_ENABLED", "true"),
        os.environ.get("CU_QDRANT_ENABLED", "true"),
    )
    if rabbit_enabled:
        rabbit_loop(base, headers)
    else:
        poll_loop(base, headers, poll_seconds)


if __name__ == "__main__":
    main()
