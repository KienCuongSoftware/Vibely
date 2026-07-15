"""OpenCLIP frame embeddings + zero-shot semantic tag priors."""

from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np
from PIL import Image

from .vocab_catalog import CLIP_TAG_PROMPTS

LOG = logging.getLogger("content_understanding.clip")

_CLIP = None
_PREPROCESS = None
_MODEL_ID = None
_TEXT_EMBEDDINGS: dict[str, np.ndarray] | None = None
_MODERATION_TEXT_EMBEDDINGS: dict[str, np.ndarray] | None = None

# Dedicated moderation CLIP prompts — scored OUTSIDE discovery top-K softmax.
# Discovery tags often win noise (satisfying/car_vlog); these always emit scores for policy.
MODERATION_CLIP_PROMPTS: dict[str, tuple[str, ...]] = {
    "nsfw": (
        "pornographic explicit sexual content",
        "nsfw adult sexual video",
        "explicit sex scene",
    ),
    "porn": (
        "hardcore pornography video",
        "porn sex tape",
        "explicit adult porn",
    ),
    "nudity": (
        "full frontal nudity naked person",
        "nude body without clothes",
        "topless exposed genitals",
    ),
    "explicit": (
        "explicit sexual act",
        "graphic sexual activity",
        "explicit adult sexual intercourse",
    ),
    "violence": (
        "graphic violence assault fighting",
        "people violently attacking each other",
        "bloody violent fight",
    ),
    "gore": (
        "graphic gore bloody injury",
        "severe wounds and gore",
        "disturbing bloody violence",
    ),
    "guns": (
        "person aiming a gun firearm",
        "gun shooting at people",
        "firearm pointed at someone",
    ),
}

# Safe anchors for relative scoring (CLIP cosine alone is poorly calibrated).
_SAFE_CLIP_PROMPTS: tuple[str, ...] = (
    "safe for work family friendly video",
    "everyday lifestyle vlog",
    "normal people talking outdoors",
    "cooking food or travel scenery",
)


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


def _encode_prompt_mean(prompts: list[str] | tuple[str, ...]) -> np.ndarray:
    import open_clip
    import torch

    model, device, _, _ = _CLIP
    tokenizer = open_clip.get_tokenizer(_CLIP[2])
    with torch.no_grad():
        tokens = tokenizer(list(prompts)).to(device)
        feats = model.encode_text(tokens)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        mean = feats.mean(dim=0)
        mean = mean / mean.norm()
        return mean.detach().cpu().numpy().astype(np.float32)


def _text_embeddings() -> dict[str, np.ndarray]:
    global _TEXT_EMBEDDINGS
    if _TEXT_EMBEDDINGS is not None:
        return _TEXT_EMBEDDINGS
    _load_clip()
    out: dict[str, np.ndarray] = {}
    for slug, prompts in CLIP_TAG_PROMPTS.items():
        out[slug] = _encode_prompt_mean(prompts)
    _TEXT_EMBEDDINGS = out
    return out


def _moderation_text_embeddings() -> dict[str, np.ndarray]:
    global _MODERATION_TEXT_EMBEDDINGS
    if _MODERATION_TEXT_EMBEDDINGS is not None:
        return _MODERATION_TEXT_EMBEDDINGS
    _load_clip()
    out: dict[str, np.ndarray] = {
        slug: _encode_prompt_mean(prompts) for slug, prompts in MODERATION_CLIP_PROMPTS.items()
    }
    out["__safe__"] = _encode_prompt_mean(_SAFE_CLIP_PROMPTS)
    _MODERATION_TEXT_EMBEDDINGS = out
    return out


def _score_moderation(video_mean: np.ndarray, model_id: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Always score NSFW/violence prompts vs safe anchors (independent of discovery top-K)."""
    emb = _moderation_text_embeddings()
    safe_vec = emb["__safe__"]
    safe_sim = float(np.dot(video_mean, safe_vec))
    emit_min = float(os.environ.get("CU_MODERATION_CLIP_MIN_RAW", "0.18"))
    margin_min = float(os.environ.get("CU_MODERATION_CLIP_MIN_MARGIN", "0.02"))
    tag_min = float(os.environ.get("CU_MODERATION_CLIP_TAG_MIN", "0.35"))

    scores: list[dict[str, Any]] = []
    tags: list[dict[str, Any]] = []
    for slug in MODERATION_CLIP_PROMPTS:
        raw = float(np.dot(video_mean, emb[slug]))
        margin = raw - safe_sim
        # Map margin to [0,1]; raw alone is usually ~0.15–0.35.
        relative = max(0.0, min(1.0, (margin + 0.05) / 0.25))
        # Blend absolute similarity so hard nudes still fire even vs ambiguous safe.
        blended = max(0.0, min(1.0, 0.55 * relative + 0.45 * max(0.0, (raw - 0.12) / 0.25)))
        scores.append(
            {
                "slug": slug,
                "raw": round(raw, 4),
                "safeSim": round(safe_sim, 4),
                "margin": round(margin, 4),
                "confidence": round(blended, 3),
            }
        )
        if blended >= tag_min and (raw >= emit_min or margin >= margin_min):
            tags.append(
                {
                    "slug": slug,
                    "confidence": round(min(0.95, 0.5 + blended * 0.45), 3),
                    "source": "moderation_visual",
                    "modelVersion": model_id,
                    "reason": f"CLIP moderation raw={raw:.3f} margin={margin:.3f}",
                    "evidence": {
                        "rawScore": round(raw, 4),
                        "safeSim": round(safe_sim, 4),
                        "margin": round(margin, 4),
                        "blended": round(blended, 3),
                    },
                }
            )
    scores.sort(key=lambda x: float(x.get("confidence") or 0), reverse=True)
    return scores, tags


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
    visual_tags: list[dict[str, Any]] = []
    tag_scores: list[dict[str, Any]] = []
    if top:
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

    moderation_scores: list[dict[str, Any]] = []
    moderation_tags: list[dict[str, Any]] = []
    try:
        moderation_scores, moderation_tags = _score_moderation(video_mean, model_id)
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Moderation CLIP scoring failed (%s)", exc)

    # Prefer moderation visual tags when they fire (policy > discovery label).
    fused_tags = list(moderation_tags)
    seen = {t["slug"] for t in fused_tags}
    for tag in visual_tags:
        if tag["slug"] in seen:
            continue
        fused_tags.append(tag)
        seen.add(tag["slug"])

    return {
        "visualFeatures": {
            "modelId": model_id,
            "frameCount": int(vectors.shape[0]),
            "vectorDim": int(vectors.shape[1]),
            "tagScores": tag_scores[:8],
            "moderationScores": moderation_scores,
            "videoMeanSample": video_mean[:8].tolist(),
        },
        "visualTags": fused_tags,
        "frameVectors": vectors,
        "modelId": model_id,
    }
