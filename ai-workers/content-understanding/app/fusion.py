"""Late weighted evidential fusion (TDD §3.8) — Phase 2 shippable weights."""

from __future__ import annotations

import math
import os
from typing import Any

# Modality reliability weights (Model Registry-style defaults)
MODALITY_WEIGHTS: dict[str, float] = {
    "metadata": 0.70,
    "ocr": 1.20,
    "speech": 1.10,
    "visual": 1.40,
    "object": 1.30,
    "scene": 1.00,
    "fusion": 1.00,
}

# Metadata/hashtag must not dominate (TDD: boost ≤ 0.25)
METADATA_MAX_CONTRIB = 0.25
FUSION_BIAS = float(os.environ.get("CU_FUSION_BIAS", "-0.35"))
STORE_TAU = float(os.environ.get("CU_FUSION_STORE_TAU", "0.35"))
SOFT_CAP = int(os.environ.get("CU_FUSION_SOFT_CAP", "50"))


def _sigmoid(x: float) -> float:
    # numerically stable
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def _logit_like(confidence: float) -> float:
    """Map [0,1] confidence to a soft evidence value (approx calibrated)."""
    c = min(0.999, max(0.001, float(confidence)))
    return math.log(c / (1.0 - c))


def fuse_tags(*groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Combine multimodal tag hypotheses into fused posteriors.

    For each tag t: s(t) = σ(Σ_m w_m · z_m(t) + b), with metadata contribution capped.
    """
    # slug -> modality -> best item
    by_slug: dict[str, dict[str, dict[str, Any]]] = {}
    for group in groups:
        for item in group or []:
            slug = str(item.get("slug") or "").strip().lower()
            if not slug:
                continue
            source = str(item.get("source") or "fusion").strip().lower()
            slot = by_slug.setdefault(slug, {})
            prev = slot.get(source)
            if prev is None or float(item.get("confidence") or 0) > float(prev.get("confidence") or 0):
                slot[source] = dict(item)

    fused: list[dict[str, Any]] = []
    for slug, modalities in by_slug.items():
        evidence = 0.0
        reasons: list[str] = []
        evidence_map: dict[str, Any] = {"modalities": {}}
        best_items: list[dict[str, Any]] = []

        for source, item in modalities.items():
            conf = float(item.get("confidence") or 0.0)
            if conf <= 0:
                continue
            w = MODALITY_WEIGHTS.get(source, 1.0)
            # Use confidence as soft probability; mix with logit for stretch
            z = 0.65 * conf + 0.35 * (0.5 + 0.5 * math.tanh(_logit_like(conf) / 3.0))
            contrib = w * z
            if source == "metadata":
                contrib = min(METADATA_MAX_CONTRIB, contrib)
            evidence += contrib
            reasons.append(str(item.get("reason") or source))
            evidence_map["modalities"][source] = {
                "confidence": round(conf, 3),
                "weight": w,
                "contrib": round(contrib, 3),
            }
            best_items.append(item)

        if evidence <= 0:
            continue

        # Multi-modality agreement bonus
        if len(modalities) > 1:
            evidence += 0.15 * (len(modalities) - 1)

        posterior = _sigmoid(evidence + FUSION_BIAS)
        if posterior < STORE_TAU:
            continue

        sources = set(modalities.keys())
        source_label = "fusion" if len(sources) > 1 else next(iter(sources))
        model_versions = sorted(
            {
                str(i.get("modelVersion"))
                for i in best_items
                if i.get("modelVersion")
            }
        )
        fused.append(
            {
                "slug": slug,
                "confidence": round(min(0.99, posterior), 3),
                "source": source_label,
                "modelVersion": "+".join(model_versions[:4]) or "fusion-phase2-v1",
                "reason": "; ".join(reasons[:6]),
                "evidence": {
                    **evidence_map,
                    "rawEvidence": round(evidence, 3),
                    "bias": FUSION_BIAS,
                },
            }
        )

    fused.sort(key=lambda t: float(t["confidence"]), reverse=True)
    return fused[:SOFT_CAP]
