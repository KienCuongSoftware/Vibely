"""YOLOv8n lite object detection → semantic tags + scene heuristics."""

from __future__ import annotations

import logging
import os
from collections import Counter, defaultdict
from typing import Any

LOG = logging.getLogger("content_understanding.yolo")

_MODEL = None
_MODEL_ID = "yolov8n:unavailable"

# COCO class name → semantic tag slug (existing lexicon / Explore mapping)
COCO_TO_TAG: dict[str, str] = {
    "cat": "cat",
    "dog": "dog",
    "bicycle": "travel",
    "car": "city",
    "motorcycle": "city",
    "bus": "city",
    "train": "travel",
    "airplane": "travel",
    "boat": "travel",
    "traffic light": "city",
    "bench": "city",
    "backpack": "travel",
    "umbrella": "rain",
    "suitcase": "travel",
    "sports ball": "gaming",
    "skateboard": "travel",
    "surfboard": "travel",
    "tennis racket": "gaming",
    "bottle": "food",
    "wine glass": "food",
    "cup": "food",
    "fork": "food",
    "knife": "food",
    "spoon": "food",
    "bowl": "food",
    "banana": "food",
    "apple": "food",
    "sandwich": "food",
    "orange": "food",
    "broccoli": "food",
    "carrot": "food",
    "hot dog": "food",
    "pizza": "food",
    "donut": "food",
    "cake": "food",
    "chair": "city",
    "couch": "lofi",
    "bed": "lofi",
    "dining table": "food",
    "toilet": "city",
    "tv": "gaming",
    "laptop": "coding",
    "mouse": "coding",
    "remote": "gaming",
    "keyboard": "coding",
    "cell phone": "coding",
    "microwave": "food",
    "oven": "food",
    "toaster": "food",
    "sink": "food",
    "refrigerator": "food",
    "book": "education",
    "clock": "city",
    "vase": "travel",
}

INDOOR_CLASSES = frozenset(
    {
        "couch",
        "bed",
        "toilet",
        "tv",
        "laptop",
        "microwave",
        "oven",
        "sink",
        "refrigerator",
        "dining table",
        "chair",
        "keyboard",
        "mouse",
        "book",
        "clock",
        "vase",
        "potted plant",
    }
)
OUTDOOR_CLASSES = frozenset(
    {
        "car",
        "bus",
        "truck",
        "motorcycle",
        "bicycle",
        "traffic light",
        "fire hydrant",
        "stop sign",
        "parking meter",
        "bench",
        "bird",
        "airplane",
        "boat",
        "train",
        "skateboard",
        "surfboard",
        "umbrella",
    }
)


def _load_model():
    global _MODEL, _MODEL_ID
    if _MODEL is not None:
        return
    from ultralytics import YOLO

    weights = os.environ.get("CU_YOLO_WEIGHTS", "yolov8n.pt")
    device = os.environ.get("CU_YOLO_DEVICE", "")
    model = YOLO(weights)
    _MODEL = model
    _MODEL_ID = f"ultralytics:{weights}:{device or 'auto'}"
    LOG.info("Loaded YOLO %s", _MODEL_ID)


def analyze_objects(frames: list[dict]) -> dict[str, Any]:
    """
    Run YOLOv8n on sampled frames.

    Returns objectTags, objectFeatures, sceneFeatures. Soft-fails to empty.
    """
    enabled = os.environ.get("CU_YOLO_ENABLED", "true").lower() in {"1", "true", "yes"}
    if not enabled:
        return _empty("yolo disabled")
    if not frames:
        return _empty("no frames")

    try:
        _load_model()
    except Exception as exc:  # noqa: BLE001
        LOG.warning("YOLO unavailable (%s)", exc)
        return _empty(f"yolo unavailable: {exc}")

    conf_min = float(os.environ.get("CU_YOLO_CONF", "0.35"))
    max_frames = int(os.environ.get("CU_YOLO_MAX_FRAMES", "6"))
    selected = frames[:max_frames]

    class_hits: dict[str, list[float]] = defaultdict(list)
    per_frame: list[dict[str, Any]] = []
    person_count = 0

    try:
        for frame in selected:
            image = frame.get("image")
            if image is None:
                continue
            results = _MODEL.predict(
                source=image,
                conf=conf_min,
                verbose=False,
                device=os.environ.get("CU_YOLO_DEVICE") or None,
            )
            detections: list[dict[str, Any]] = []
            for result in results:
                names = result.names or {}
                boxes = result.boxes
                if boxes is None:
                    continue
                for box in boxes:
                    cls_id = int(box.cls.item())
                    score = float(box.conf.item())
                    label = str(names.get(cls_id, cls_id)).strip().lower()
                    detections.append({"class": label, "confidence": round(score, 3)})
                    class_hits[label].append(score)
                    if label == "person":
                        person_count += 1
            per_frame.append(
                {
                    "index": frame.get("index"),
                    "tMs": frame.get("tMs"),
                    "detections": detections[:40],
                }
            )
    except Exception as exc:  # noqa: BLE001
        LOG.warning("YOLO infer failed (%s)", exc)
        return _empty(f"yolo infer failed: {exc}")

    object_tags = _tags_from_hits(class_hits, person_count=person_count, frame_count=len(selected))
    scene_features = _scene_from_hits(class_hits, person_count=person_count)

    top_counts = Counter({k: len(v) for k, v in class_hits.items()})
    object_features = {
        "engine": _MODEL_ID,
        "frameCount": len(selected),
        "classCounts": dict(top_counts.most_common(30)),
        "classMaxConf": {k: round(max(v), 3) for k, v in list(class_hits.items())[:40]},
        "frames": per_frame,
        "personDetections": person_count,
        "note": "ok",
    }
    return {
        "objectTags": object_tags,
        "objectFeatures": object_features,
        "sceneFeatures": scene_features,
        "sceneTags": scene_features.get("sceneTags") or [],
        "modelId": _MODEL_ID,
    }


def _tags_from_hits(
    class_hits: dict[str, list[float]],
    *,
    person_count: int,
    frame_count: int,
) -> list[dict[str, Any]]:
    by_slug: dict[str, dict[str, Any]] = {}
    for label, scores in class_hits.items():
        slug = COCO_TO_TAG.get(label)
        if not slug:
            continue
        avg = sum(scores) / max(1, len(scores))
        dwell = len(scores) / max(1, frame_count)
        conf = min(0.95, 0.45 + 0.35 * avg + 0.2 * min(1.0, dwell))
        if conf < 0.5:
            continue
        prev = by_slug.get(slug)
        if prev is None or conf > float(prev["confidence"]):
            by_slug[slug] = {
                "slug": slug,
                "confidence": round(conf, 3),
                "source": "object",
                "modelVersion": _MODEL_ID,
                "reason": f"yolo:{label} x{len(scores)}",
                "evidence": {
                    "class": label,
                    "count": len(scores),
                    "maxConf": round(max(scores), 3),
                    "avgConf": round(avg, 3),
                },
            }

    # Dense people → mild comedy/education neutral skip; keep person evidence only in features
    _ = person_count
    return list(by_slug.values())


def _scene_from_hits(class_hits: dict[str, list[float]], *, person_count: int) -> dict[str, Any]:
    indoor = sum(len(v) for k, v in class_hits.items() if k in INDOOR_CLASSES)
    outdoor = sum(len(v) for k, v in class_hits.items() if k in OUTDOOR_CLASSES)
    labels: list[dict[str, Any]] = []
    scene_tags: list[dict[str, Any]] = []

    total = indoor + outdoor
    if total > 0:
        if indoor >= outdoor:
            conf = min(0.9, 0.5 + 0.4 * (indoor / total))
            labels.append({"label": "indoors", "confidence": round(conf, 3)})
        if outdoor > indoor:
            conf = min(0.9, 0.5 + 0.4 * (outdoor / total))
            labels.append({"label": "outdoors", "confidence": round(conf, 3)})
            # outdoors often travel/city — boost handled via object tags
            scene_tags.append(
                {
                    "slug": "travel" if outdoor >= 3 else "city",
                    "confidence": round(min(0.85, conf), 3),
                    "source": "scene",
                    "modelVersion": _MODEL_ID,
                    "reason": f"yolo scene heuristic outdoor={outdoor}/indoor={indoor}",
                    "evidence": {"indoor": indoor, "outdoor": outdoor},
                }
            )
        if indoor > outdoor and indoor >= 2:
            scene_tags.append(
                {
                    "slug": "lofi",
                    "confidence": round(min(0.75, 0.45 + 0.1 * indoor), 3),
                    "source": "scene",
                    "modelVersion": _MODEL_ID,
                    "reason": f"yolo scene heuristic indoor={indoor}",
                    "evidence": {"indoor": indoor, "outdoor": outdoor},
                }
            )

    if "umbrella" in class_hits or any("rain" in k for k in class_hits):
        labels.append({"label": "rain", "confidence": 0.7})

    return {
        "labels": labels,
        "indoorHits": indoor,
        "outdoorHits": outdoor,
        "personDetections": person_count,
        "source": "yolo_heuristic",
        "sceneTags": scene_tags,
        "note": "ok" if labels or scene_tags else "no_scene_signal",
    }


def _empty(note: str) -> dict[str, Any]:
    return {
        "objectTags": [],
        "objectFeatures": {"note": note, "classCounts": {}},
        "sceneFeatures": {"labels": [], "note": note},
        "sceneTags": [],
        "modelId": _MODEL_ID,
    }
