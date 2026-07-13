from __future__ import annotations

import logging
import os
from pathlib import Path
from urllib.parse import urlparse

import requests

LOG = logging.getLogger("originality.download")


def download_video(video_url: str, dest: Path) -> Path:
    """
    Download raw upload.
    Prefer AWS S3 SDK when URL maps to configured bucket; otherwise HTTP GET.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    bucket = os.environ.get("AWS_S3_BUCKET", "")
    region = os.environ.get("AWS_REGION", "ap-southeast-2")
    key = _try_s3_key(video_url, bucket)
    if bucket and key and os.environ.get("AWS_ACCESS_KEY_ID"):
        import boto3

        client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
        client.download_file(bucket, key, str(dest))
        return dest

    with requests.get(video_url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        with dest.open("wb") as fh:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    fh.write(chunk)
    return dest


def _try_s3_key(video_url: str, bucket: str) -> str | None:
    if not video_url:
        return None
    if video_url.startswith("uploads/"):
        return video_url
    parsed = urlparse(video_url)
    path = parsed.path.lstrip("/")
    if bucket and path.startswith(bucket + "/"):
        path = path[len(bucket) + 1 :]
    if "uploads/" in path:
        idx = path.find("uploads/")
        return path[idx:]
    return None
