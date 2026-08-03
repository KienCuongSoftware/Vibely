"""Generate a simple HLS ladder from enhanced MP4."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

LOG = logging.getLogger("ai_enhance.hls")


def generate_hls(enhanced_mp4: Path, hls_dir: Path, max_height: int) -> Path:
    hls_dir.mkdir(parents=True, exist_ok=True)
    rungs = [h for h in (360, 480, 720, 1080, 1440, 2160) if h <= max_height]
    if not rungs:
        rungs = [max_height]
    master_lines = ["#EXTM3U", "#EXT-X-VERSION:3"]
    for h in rungs:
        variant_dir = hls_dir / f"{h}p"
        variant_dir.mkdir(parents=True, exist_ok=True)
        playlist = variant_dir / "playlist.m3u8"
        bw = max(400_000, h * h * 2)
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(enhanced_mp4),
            "-vf",
            f"scale=-2:{h}",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-hls_time",
            "6",
            "-hls_playlist_type",
            "vod",
            "-hls_segment_filename",
            str(variant_dir / "seg_%03d.ts"),
            str(playlist),
        ]
        LOG.info("HLS rung %sp", h)
        subprocess.check_call(cmd)
        master_lines.append(f"#EXT-X-STREAM-INF:BANDWIDTH={bw},RESOLUTION={int(h * 16 / 9)}x{h}")
        master_lines.append(f"{h}p/playlist.m3u8")
    master = hls_dir / "playlist.m3u8"
    master.write_text("\n".join(master_lines) + "\n", encoding="utf-8")
    return master
