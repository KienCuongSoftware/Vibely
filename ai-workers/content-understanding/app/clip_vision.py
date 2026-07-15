"""OpenCLIP frame embeddings + zero-shot semantic tag priors."""

from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np
from PIL import Image

LOG = logging.getLogger("content_understanding.clip")

_CLIP = None
_PREPROCESS = None
_MODEL_ID = None
_TEXT_EMBEDDINGS: dict[str, np.ndarray] | None = None

# slug -> English prompts (zero-shot priors)
CLIP_TAG_PROMPTS: dict[str, tuple[str, ...]] = {
    "anime": ("anime illustration", "anime character art", "japanese animation wallpaper"),
    "manga": ("manga comic art", "manga drawing"),
    "music": ("music video", "person singing", "musical performance"),
    "horror": ("horror scene", "scary dark atmosphere", "creepy image"),
    "gaming": ("video game gameplay", "gaming screen", "esports match"),
    "food": ("vietnamese food", "street food dish", "cooking food"),
    "travel": ("travel scenery", "beach landscape", "city travel vlog"),
    "comedy": ("funny meme", "comedy sketch"),
    "education": ("coding tutorial screen", "classroom lecture", "whiteboard explanation"),
    "night": ("night city lights", "dark night scene"),
    "sad": ("sad emotional scene", "melancholy mood"),
    "lofi": ("lofi aesthetic room", "chill study aesthetic"),
    "cat": ("a photo of a cat", "cute cat"),
    "dog": ("a photo of a dog", "cute dog"),
    "rain": ("rainy weather", "rain on window"),
    "city": ("city skyline", "urban street"),
    "girl": ("young woman portrait", "girl selfie"),
    "boy": ("young man portrait", "boy selfie"),
    "coding": ("programmer at computer", "code on screen"),
}


def _load_clip():
    global _CLIP, _PREPROCESS, _MODEL_ID
    if _CLIP is not None:
        return
    import open_clip
    import torch

    name = os.environ.get("CU_CLIP_MODEL", "ViT-B-32")
    pretrained = os.environ.get("CU_CLIP_PRETRAINED", "openai")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(name, pretrained=pretrained)
    model.eval()
    model.to(device)
    _CLIP = (model, device, name, pretrained)
    _PREPROCESS = preprocess
    _MODEL_ID = f"open_clip:{name}:{pretrained}:{device}"
    LOG.info("Loaded CLIP %s", _MODEL_ID)


def _encode_images(frames: list[dict]) -> tuple[np.ndarray, str]:
    try:
        _load_clip()
        import torch

        model, device, _, _ = _CLIP
        preprocess = _PREPROCESS
        vectors = []
        with torch.no_grad():
            for frame in frames:
                image = frame.get("image")
                if image is None:
                    continue
                import cv2

                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                pil = Image.fromarray(rgb)
                tensor = preprocess(pil).unsqueeze(0).to(device)
                feat = model.encode_image(tensor)
                feat = feat / feat.norm(dim=-1, keepdim=True)
                vectors.append(feat.detach().cpu().numpy().astype(np.float32)[0])
        if not vectors:
            return np.zeros((0, 512), dtype=np.float32), _MODEL_ID or "clip:none"
        return np.stack(vectors, axis=0), _MODEL_ID or "open_clip"
    except Exception as exc:  # noqa: BLE001
        LOG.warning("CLIP unavailable (%s)", exc)
        return np.zeros((0, 512), dtype=np.float32), "clip:unavailable"


def _text_embeddings() -> dict[str, np.ndarray]:
    global _TEXT_EMBEDDINGS
    if _TEXT_EMBEDDINGS is not None:
        return _TEXT_EMBEDDINGS
    _load_clip()
    import open_clip
    import torch

    model, device, _, _ = _CLIP
    tokenizer = open_clip.get_tokenizer(_CLIP[2])
    out: dict[str, np.ndarray] = {}
    with torch.no_grad():
        for slug, prompts in CLIP_TAG_PROMPTS.items():
            tokens = tokenizer(list(prompts)).to(device)
            feats = model.encode_text(tokens)
            feats = feats / feats.norm(dim=-1, keepdim=True)
            mean = feats.mean(dim=0)
            mean = mean / mean.norm()
            out[slug] = mean.detach().cpu().numpy().astype(np.float32)
    _TEXT_EMBEDDINGS = out
    return out


def mean_pool(vectors: np.ndarray) -> np.ndarray:
    if vectors.size == 0:
        return np.zeros(512, dtype=np.float32)
    mean = vectors.mean(axis=0)
    norm = np.linalg.norm(mean) + 1e-8
    return (mean / norm).astype(np.float32)


def analyze_visual(frames: list[dict]) -> dict[str, Any]:
    if os.environ.get("CU_CLIP_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        return {
            "visualFeatures": {"note": "CU_CLIP_ENABLED=false"},
            "visualTags": [],
            "frameVectors": np.zeros((0, 512), dtype=np.float32),
            "modelId": "clip:disabled",
        }

    vectors, model_id = _encode_images(frames)
    if vectors.size == 0:
        return {
            "visualFeatures": {"note": "no frame vectors", "modelId": model_id},
            "visualTags": [],
            "frameVectors": vectors,
            "modelId": model_id,
        }

    video_mean = mean_pool(vectors)
    text_emb = _text_embeddings()
    raw_scores: list[tuple[str, float]] = []
    for slug, text_vec in text_emb.items():
        score = float(np.dot(video_mean, text_vec))
        raw_scores.append((slug, score))

    raw_scores.sort(key=lambda x: x[1], reverse=True)
    # softmax over top candidates for calibrated confidence
    top = raw_scores[:12]
    if not top:
        return {
            "visualFeatures": {"tagScores": [], "modelId": model_id, "frameCount": len(vectors)},
            "visualTags": [],
            "frameVectors": vectors,
            "modelId": model_id,
        }

    logits = np.array([s for _, s in top], dtype=np.float32)
    logits = logits - logits.max()
    probs = np.exp(logits * 8.0)
    probs = probs / (probs.sum() + 1e-8)

    # Softmax is flat across similar prompts — keep top-K near the winner only.
    threshold = float(os.environ.get("CU_CLIP_TAG_THRESHOLD", "0.08"))
    min_raw_top1 = float(os.environ.get("CU_CLIP_TOP1_MIN_RAW", "0.20"))
    max_tags = int(os.environ.get("CU_CLIP_MAX_TAGS", "3"))
    relative = float(os.environ.get("CU_CLIP_RELATIVE", "0.75"))
    top1_conf = float(probs[0]) if len(probs) else 0.0
    visual_tags: list[dict[str, Any]] = []
    tag_scores = []
    for i, (slug, raw) in enumerate(top):
        conf = float(probs[i])
        tag_scores.append({"slug": slug, "raw": round(raw, 4), "confidence": round(conf, 3)})
        near_top = conf >= top1_conf * relative
        keep = (conf >= threshold and near_top) or (i == 0 and raw >= min_raw_top1)
        if not keep:
            continue
        visual_tags.append(
            {
                "slug": slug,
                "confidence": round(min(0.95, 0.45 + conf * 0.55), 3),
                "source": "visual",
                "modelVersion": model_id,
                "reason": f"CLIP zero-shot score={raw:.3f}",
                "evidence": {"rawScore": round(raw, 4), "softmax": round(conf, 3)},
            }
        )
        if len(visual_tags) >= max_tags:
            break

    return {
        "visualFeatures": {
            "modelId": model_id,
            "frameCount": int(vectors.shape[0]),
            "vectorDim": int(vectors.shape[1]),
            "tagScores": tag_scores[:8],
            "videoMeanSample": video_mean[:8].tolist(),
        },
        "visualTags": visual_tags,
        "frameVectors": vectors,
        "modelId": model_id,
    }
