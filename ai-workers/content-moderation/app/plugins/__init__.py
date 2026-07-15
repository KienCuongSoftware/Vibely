"""Detector plugins: score stored CU features; never re-download video media."""

from __future__ import annotations

from typing import Any

from .nsfw_cu_v1 import score as score_nsfw
from .violence_cu_v1 import score as score_violence

_REGISTRY = {
    "nsfw_cu_v1": score_nsfw,
    "violence_cu_v1": score_violence,
}


def run_plugins(claim: dict[str, Any]) -> dict[str, Any]:
    """
    Run enabled detectors from claim payload against the CU feature snapshot.

    Returns map plugin_code -> {score, snippet, details, artifact_kind}.
    """
    snapshot = claim.get("snapshot") or {}
    detectors = claim.get("detectors") or []
    results: dict[str, Any] = {}

    # If Spring hasn't shipped detectors yet, run built-in pack on stored features.
    if not detectors:
        detectors = [
            {"code": code, "enabled": True, "config": {}, "artifactKind": "heuristic"}
            for code in _REGISTRY
        ]

    for det in detectors:
        if det.get("enabled") is False:
            continue
        code = str(det.get("code") or "")
        fn = _REGISTRY.get(code)
        if fn is None:
            continue
        config = det.get("config") or det.get("configJson") or {}
        try:
            out = fn(snapshot, config if isinstance(config, dict) else {})
        except Exception as exc:  # noqa: BLE001
            out = {
                "score": 0.0,
                "snippet": f"{code}:error",
                "details": {"error": str(exc)[:200]},
            }
        out = dict(out or {})
        out.setdefault("score", 0.0)
        out["artifact_kind"] = det.get("artifactKind") or det.get("artifact_kind") or "heuristic"
        results[code] = out
    return results


__all__ = ["run_plugins"]
