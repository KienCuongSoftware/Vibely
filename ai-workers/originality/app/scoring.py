"""Policy v1 scoring — locked weights from Vibely Originality TDD."""

from __future__ import annotations

import json
from typing import Any

WEIGHT_VISUAL = 0.40
WEIGHT_AUDIO = 0.20
WEIGHT_OCR = 0.15
WEIGHT_WATERMARK = 0.15
WEIGHT_METADATA = 0.05
WEIGHT_SCENE = 0.05

POLICY_VERSION = "v1"


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def risk_and_decision(
    risk_score: float,
    visual: float,
    watermark: float,
    metadata: float = 0.0,
) -> tuple[str, str]:
    """
    risk_score in [0,100].
    Returns (risk_level, decision).
    """
    if risk_score >= 70.0 and visual >= 0.88:
        return "HIGH", "BLOCK"
    if risk_score >= 70.0 or (watermark >= 0.75 and visual >= 0.55):
        return "HIGH", "LIMIT_DISTRIBUTION"
    # Known downloader filenames (snaptik, …) → soft restrict like TikTok content check.
    if metadata >= 0.85:
        return "HIGH", "LIMIT_DISTRIBUTION"
    if risk_score >= 35.0 or watermark >= 0.55 or metadata >= 0.50:
        return "MEDIUM", "REVIEW"
    return "LOW", "ALLOW"


def compute_scores(signals: dict[str, Any]) -> dict[str, Any]:
    visual = clamp01(signals.get("visual_similarity", 0.0))
    audio = clamp01(signals.get("audio_similarity", 0.0))
    ocr = clamp01(signals.get("ocr_similarity", 0.0))
    watermark = clamp01(signals.get("watermark_score", 0.0))
    metadata = clamp01(signals.get("metadata_score", 0.0))
    scene = clamp01(signals.get("scene_object_score", 0.0))

    risk = 100.0 * (
        WEIGHT_VISUAL * visual
        + WEIGHT_AUDIO * audio
        + WEIGHT_OCR * ocr
        + WEIGHT_WATERMARK * watermark
        + WEIGHT_METADATA * metadata
        + WEIGHT_SCENE * scene
    )
    originality = 100.0 - risk

    agreeing = 0
    if visual >= 0.75:
        agreeing += 1
    if audio >= 0.75:
        agreeing += 1
    if ocr >= 0.55:
        agreeing += 1
    if watermark >= 0.70:
        agreeing += 1
    if metadata >= 0.85:
        agreeing += 1
    confidence = clamp01(0.35 + 0.20 * agreeing + 0.25 * visual)

    risk_level, decision = risk_and_decision(risk, visual, watermark, metadata)
    return {
        "originalityScore": round(originality, 4),
        "visualSimilarity": round(visual, 6),
        "audioSimilarity": round(audio, 6),
        "ocrSimilarity": round(ocr, 6),
        "watermarkScore": round(watermark, 6),
        "metadataScore": round(metadata, 6),
        "sceneObjectScore": round(scene, 6),
        "overallConfidence": round(confidence, 6),
        "riskLevel": risk_level,
        "decision": decision,
        "riskRaw": round(risk, 4),
    }


def build_complete_payload(analysis: dict[str, Any]) -> dict[str, Any]:
    scores = compute_scores(analysis["signals"])
    matched_video_id = analysis.get("matched_video_id")
    explain = {
        "policyVersion": POLICY_VERSION,
        "matchedVideoId": matched_video_id,
        "visual": analysis.get("visual_explain", []),
        "audio": analysis.get("audio_explain", {}),
        "ocr": analysis.get("ocr_explain", {}),
        "watermark": analysis.get("watermark_explain", {}),
        "metadata": analysis.get("metadata_explain", {}),
        "frameCount": analysis.get("frame_count", 0),
        "sampleStrategy": analysis.get("sample_strategy", ""),
    }
    # Clamp match scores — Qdrant cosine can exceed 1.0 slightly and fail @DecimalMax.
    matches: list[dict[str, Any]] = []
    for raw in analysis.get("matches") or []:
        if not isinstance(raw, dict) or raw.get("matchedVideoId") is None:
            continue
        matches.append(
            {
                **raw,
                "matchedVideoId": int(raw["matchedVideoId"]),
                "score": clamp01(raw.get("score", 0.0)),
                "modality": str(raw.get("modality") or "VISUAL").strip().upper() or "VISUAL",
                "detailJson": raw.get("detailJson") or "{}",
            }
        )
    payload = {
        **scores,
        "matchedVideoId": int(matched_video_id) if matched_video_id is not None else None,
        "explainJson": json.dumps(explain, ensure_ascii=False),
        "modelVersions": json.dumps(analysis.get("model_versions", {}), ensure_ascii=False),
        "matches": matches,
    }
    return payload
