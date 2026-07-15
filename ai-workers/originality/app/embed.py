from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import numpy as np
from PIL import Image

LOG = logging.getLogger("originality.embed")

_CLIP_MODEL = None
_CLIP_PREPROCESS = None
_CLIP_NAME = None


def _load_clip():
    global _CLIP_MODEL, _CLIP_PREPROCESS, _CLIP_NAME
    if _CLIP_MODEL is not None:
        return
    import open_clip
    import torch

    name = __import__("os").environ.get("ORIGINALITY_CLIP_MODEL", "ViT-B-32")
    pretrained = __import__("os").environ.get("ORIGINALITY_CLIP_PRETRAINED", "openai")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(name, pretrained=pretrained)
    model.eval()
    model.to(device)
    _CLIP_MODEL = (model, device)
    _CLIP_PREPROCESS = preprocess
    _CLIP_NAME = f"open_clip:{name}:{pretrained}:{device}"
    LOG.info("Loaded CLIP %s", _CLIP_NAME)


def warm_clip() -> None:
    """Eager-load CLIP at worker boot so the first claim is not a multi-minute hang."""
    try:
        _load_clip()
    except Exception as exc:  # noqa: BLE001
        LOG.warning("CLIP warm failed: %s", exc)


def phash64(image_path: Path) -> int:
    """8x8 DCT-style average hash as 64-bit int (deterministic perceptual hash)."""
    img = Image.open(image_path).convert("L").resize((8, 8), Image.Resampling.LANCZOS)
    pixels = np.asarray(img, dtype=np.float32)
    avg = pixels.mean()
    bits = (pixels >= avg).astype(np.uint8).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return int(value)


def hamming64(a: int, b: int) -> int:
    return int((a ^ b).bit_count())


def phash_similarity(a: int, b: int) -> float:
    return 1.0 - (hamming64(a, b) / 64.0)


def embed_frames(frame_paths: list[Path]) -> tuple[np.ndarray, str]:
    """
    Returns (N, D) L2-normalized float32 matrix and model id string.
    Falls back to 64-d phash bit expansion if CLIP import/load fails.
    """
    try:
        _load_clip()
        import torch

        model, device = _CLIP_MODEL
        preprocess = _CLIP_PREPROCESS
        vectors = []
        with torch.no_grad():
            for path in frame_paths:
                image = preprocess(Image.open(path).convert("RGB")).unsqueeze(0).to(device)
                feat = model.encode_image(image)
                feat = feat / feat.norm(dim=-1, keepdim=True)
                vectors.append(feat.detach().cpu().numpy().astype(np.float32)[0])
        return np.stack(vectors, axis=0), _CLIP_NAME or "open_clip"
    except Exception as exc:  # noqa: BLE001
        LOG.warning("CLIP unavailable (%s); using phash bit vectors", exc)
        vectors = []
        for path in frame_paths:
            h = phash64(path)
            bits = np.array([(h >> i) & 1 for i in range(64)], dtype=np.float32)
            bits = bits * 2.0 - 1.0
            norm = np.linalg.norm(bits) + 1e-8
            vectors.append(bits / norm)
        return np.stack(vectors, axis=0), "phash64_fallback"


def mean_pool(vectors: np.ndarray) -> np.ndarray:
    mean = vectors.mean(axis=0)
    norm = np.linalg.norm(mean) + 1e-8
    return (mean / norm).astype(np.float32)


def content_fingerprint(vectors: np.ndarray) -> str:
    digest = hashlib.sha256(vectors.tobytes()).hexdigest()
    return digest[:32]
