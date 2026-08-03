"""Vibely AI Enhancement GPU Worker — production-ready poll/Rabbit consumer."""

from __future__ import annotations

import json
import logging
import os
import shutil
import socket
import subprocess
import time
from pathlib import Path

import requests

from .pipeline import run_enhancement_pipeline

LOG = logging.getLogger("ai_enhance.worker")


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def _headers() -> dict[str, str]:
    return {
        "X-Internal-Token": env(
            "ENHANCE_INTERNAL_TOKEN",
            os.environ.get("APP_ENHANCEMENT_INTERNAL_TOKEN", "vibely-dev-enhance-token"),
        ),
        "X-Worker-Id": os.environ.get("WORKER_ID")
        or f"enhance-{socket.gethostname()}-{os.getpid()}",
        "Content-Type": "application/json",
    }


def assert_runtime_ready() -> None:
    for binary in ("ffmpeg", "ffprobe"):
        if shutil.which(binary) is None:
            raise RuntimeError(f"{binary} not found on PATH")
    work = Path(os.environ.get("ENHANCE_WORK_DIR", "/tmp/enhance-work"))
    work.mkdir(parents=True, exist_ok=True)
    min_gb = float(os.environ.get("ENHANCE_MIN_FREE_GB", "5"))
    usage = shutil.disk_usage(work)
    free_gb = usage.free / (1024**3)
    if free_gb < min_gb:
        raise RuntimeError(f"Insufficient disk free={free_gb:.1f}GB need>={min_gb}GB path={work}")


def claim_and_run(base: str, headers: dict[str, str], job_id: str | None = None) -> bool:
    assert_runtime_ready()
    if job_id:
        resp = requests.post(
            f"{base}/api/internal/enhancement/jobs/{job_id}/claim",
            headers=headers,
            timeout=30,
        )
    else:
        resp = requests.post(
            f"{base}/api/internal/enhancement/claim",
            headers=headers,
            timeout=30,
        )
    if resp.status_code == 204:
        return False
    resp.raise_for_status()
    body = resp.json()
    data = body.get("data") or body
    jid = data["jobId"]
    LOG.info(
        "Claimed jobId=%s videoId=%s profile=%s",
        jid,
        data.get("videoId"),
        data.get("targetProfile"),
    )

    work_root = Path(os.environ.get("ENHANCE_WORK_DIR", "/tmp/enhance-work")) / jid
    try:
        result = run_enhancement_pipeline(data, work_root, base, headers)
        done = requests.post(
            f"{base}/api/internal/enhancement/jobs/{jid}/complete",
            headers=headers,
            json=result,
            timeout=int(os.environ.get("ENHANCE_COMPLETE_TIMEOUT", "600")),
        )
        done.raise_for_status()
        LOG.info("Completed jobId=%s playlist=%s", jid, result.get("masterPlaylistUrl", "")[:80])
    except Exception as exc:  # noqa: BLE001
        LOG.exception("Job failed jobId=%s", jid)
        try:
            requests.post(
                f"{base}/api/internal/enhancement/jobs/{jid}/fail",
                headers=headers,
                json={
                    "errorMessage": str(exc)[:1900],
                    "errorCode": "PIPELINE_ERROR",
                    "retryable": True,
                },
                timeout=30,
            )
        except Exception as fail_exc:  # noqa: BLE001
            LOG.error("Failed to report job failure: %s", fail_exc)
    finally:
        keep = os.environ.get("ENHANCE_KEEP_WORKSPACE", "false").lower() == "true"
        if not keep and work_root.exists():
            shutil.rmtree(work_root, ignore_errors=True)
    return True


def rabbit_loop(base: str, headers: dict[str, str]) -> None:
    import pika

    url = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@127.0.0.1:5672/%2F")
    queue = os.environ.get("ENHANCE_QUEUE", "ai.enhance.work")
    params = pika.URLParameters(url)
    while True:
        try:
            conn = pika.BlockingConnection(params)
            ch = conn.channel()
            ch.queue_declare(queue=queue, durable=True)
            ch.basic_qos(prefetch_count=1)

            def on_message(channel, method, properties, body):  # noqa: ARG001
                job_id = None
                try:
                    payload = json.loads(body.decode("utf-8"))
                    job_id = payload.get("jobId")
                except Exception:  # noqa: BLE001
                    LOG.warning("Invalid message body")
                try:
                    claim_and_run(base, headers, job_id=job_id)
                    channel.basic_ack(method.delivery_tag)
                except Exception as exc:  # noqa: BLE001
                    LOG.error("Message handling failed: %s", exc)
                    channel.basic_nack(method.delivery_tag, requeue=False)

            ch.basic_consume(queue=queue, on_message_callback=on_message)
            LOG.info("Consuming queue=%s", queue)
            ch.start_consuming()
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Rabbit reconnect soon: %s", exc)
            time.sleep(5)


def poll_loop(base: str, headers: dict[str, str]) -> None:
    seconds = float(os.environ.get("ENHANCE_POLL_SECONDS", "5"))
    LOG.info("Polling claim endpoint every %ss", seconds)
    while True:
        try:
            ran = claim_and_run(base, headers)
            if not ran:
                time.sleep(seconds)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Poll error: %s", exc)
            time.sleep(seconds)


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    base = env("VIBELY_API_BASE", "http://127.0.0.1:8080").rstrip("/")
    headers = _headers()
    try:
        assert_runtime_ready()
        subprocess.check_call(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:  # noqa: BLE001
        LOG.error("Worker startup health failed: %s", exc)
        raise
    LOG.info(
        "AI Enhance worker ready id=%s engine=%s",
        headers["X-Worker-Id"],
        os.environ.get("ENHANCE_ENGINE", "noop"),
    )
    if os.environ.get("ENHANCE_RABBITMQ_ENABLED", "false").lower() in ("1", "true", "yes"):
        rabbit_loop(base, headers)
    else:
        poll_loop(base, headers)


if __name__ == "__main__":
    main()
