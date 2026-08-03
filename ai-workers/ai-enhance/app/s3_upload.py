"""Upload HLS directory to S3."""

from __future__ import annotations

import logging
import mimetypes
import os
from pathlib import Path

LOG = logging.getLogger("ai_enhance.s3")


def upload_dir(local_dir: Path, s3_prefix: str) -> str:
    bucket = os.environ["AWS_S3_BUCKET"]
    region = os.environ.get("AWS_REGION", "ap-southeast-2")
    import boto3

    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )
    prefix = s3_prefix.strip("/") + "/"
    for path in local_dir.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(local_dir).as_posix()
        key = prefix + rel
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if path.suffix == ".m3u8":
            content_type = "application/vnd.apple.mpegurl"
        elif path.suffix == ".ts":
            content_type = "video/MP2T"
        LOG.info("Upload s3://%s/%s", bucket, key)
        client.upload_file(
            str(path),
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
    public_base = os.environ.get("APP_S3_PUBLIC_URL_BASE") or os.environ.get("AWS_S3_PUBLIC_URL_BASE") or ""
    public_base = public_base.rstrip("/")
    master_key = prefix + "playlist.m3u8"
    if public_base:
        return f"{public_base}/{master_key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{master_key}"
