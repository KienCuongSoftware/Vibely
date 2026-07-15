from app.engine import evaluate
from app.plugins import run_plugins


def test_nsfw_plugin_fires_on_tag():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [{"slug": "nsfw", "confidence": 0.9}],
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {},
            "object_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.nsfw_cu_v1",
                "label": "sexual_content",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "nsfw_cu_v1", "min_score": 0.55},
                "severity": "HIGH",
                "action_hint": "REVIEW",
                "points": 28,
            }
        ],
        "detectors": [{"code": "nsfw_cu_v1", "enabled": True, "config": {"min_emit": 0.25}}],
    }
    plugins = run_plugins(claim)
    assert plugins["nsfw_cu_v1"]["score"] >= 0.55
    out = evaluate(claim)
    assert out["decision"] == "REVIEW"
    assert any(e["sourceModality"] == "PLUGIN" for e in out["evidence"])


def test_nsfw_plugin_fires_on_vietnamese_caption():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [],
            "title": "Có cái đầu buồi",
            "description": "",
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {},
            "object_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.nsfw_cu_v1",
                "label": "sexual_content",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "nsfw_cu_v1", "min_score": 0.55},
                "severity": "HIGH",
                "action_hint": "BLOCK",
                "points": 45,
            }
        ],
        "detectors": [{"code": "nsfw_cu_v1", "enabled": True, "config": {"min_emit": 0.25}}],
    }
    plugins = run_plugins(claim)
    assert plugins["nsfw_cu_v1"]["score"] >= 0.55
    out = evaluate(claim)
    assert out["decision"] == "BLOCK"


def test_violence_plugin_fires_on_vietnamese_caption():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [],
            "title": "Giết người",
            "description": "",
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {},
            "object_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.violence_cu_v1",
                "label": "violence",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "violence_cu_v1", "min_score": 0.55},
                "severity": "HIGH",
                "action_hint": "BLOCK",
                "points": 45,
            }
        ],
        "detectors": [{"code": "violence_cu_v1", "enabled": True, "config": {"min_emit": 0.25}}],
    }
    plugins = run_plugins(claim)
    assert plugins["violence_cu_v1"]["score"] >= 0.55
    out = evaluate(claim)
    assert out["decision"] == "BLOCK"


def test_lex_sexual_vi_blocks_vietnamese_caption():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [],
            "title": "Có cái đầu buồi",
            "description": "",
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "lex.sexual_vi",
                "label": "sexual_content",
                "priority": 75,
                "match": {
                    "type": "lexicon",
                    "fields": ["title", "description"],
                    "patterns": ["đầu\\s*buồi", "buồi", "buoi"],
                    "flags": "i",
                },
                "severity": "HIGH",
                "action_hint": "BLOCK",
                "points": 45,
            }
        ],
    }
    out = evaluate(claim)
    assert out["decision"] == "BLOCK"


def test_nsfw_plugin_fires_on_moderation_scores():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [{"slug": "satisfying", "confidence": 0.58}],
            "title": "Video nay ne",
            "description": "",
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {
                "moderationScores": [
                    {"slug": "nsfw", "raw": 0.28, "confidence": 0.62},
                    {"slug": "nudity", "raw": 0.26, "confidence": 0.55},
                ]
            },
            "object_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.nsfw_cu_v1",
                "label": "sexual_content",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "nsfw_cu_v1", "min_score": 0.42},
                "severity": "HIGH",
                "action_hint": "BLOCK",
                "points": 45,
            }
        ],
        "detectors": [{"code": "nsfw_cu_v1", "enabled": True, "config": {"min_emit": 0.25}}],
    }
    plugins = run_plugins(claim)
    assert plugins["nsfw_cu_v1"]["score"] >= 0.42
    out = evaluate(claim)
    assert out["decision"] == "BLOCK"


def test_nsfw_plugin_fires_on_visual_nsfw_tag():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [{"slug": "nsfw", "confidence": 0.72}],
            "title": "",
            "description": "",
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {},
            "object_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.nsfw_cu_v1",
                "label": "sexual_content",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "nsfw_cu_v1", "min_score": 0.42},
                "severity": "HIGH",
                "action_hint": "BLOCK",
                "points": 45,
            }
        ],
        "detectors": [{"code": "nsfw_cu_v1", "enabled": True, "config": {"min_emit": 0.25}}],
    }
    plugins = run_plugins(claim)
    assert plugins["nsfw_cu_v1"]["score"] >= 0.42
    out = evaluate(claim)
    assert out["decision"] == "BLOCK"


def test_violence_plugin_fires_on_visual_gore_tag():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [{"slug": "gore", "confidence": 0.78}],
            "title": "",
            "description": "",
            "ocr_text": "",
            "speech_text": "",
            "visual_features": {},
            "object_features": {},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.violence_cu_v1",
                "label": "violence",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "violence_cu_v1", "min_score": 0.42},
                "severity": "HIGH",
                "action_hint": "BLOCK",
                "points": 45,
            }
        ],
        "detectors": [{"code": "violence_cu_v1", "enabled": True, "config": {"min_emit": 0.25}}],
    }
    plugins = run_plugins(claim)
    assert plugins["violence_cu_v1"]["score"] >= 0.42
    out = evaluate(claim)
    assert out["decision"] == "BLOCK"


def test_clean_content_stays_allow():
    claim = {
        "policyVersion": "2026.07.1",
        "snapshot": {
            "tags": [{"slug": "cooking", "confidence": 0.9}],
            "ocr_text": "recipe",
            "speech_text": "",
            "visual_features": {"tagScores": []},
            "object_features": {"classCounts": {"bowl": 2}},
            "trust_score": 0.5,
        },
        "policy": {"thresholds": {"allow_max": 24, "limit_max": 49, "review_max": 74}},
        "rules": [
            {
                "code": "plugin.nsfw_cu_v1",
                "label": "sexual_content",
                "priority": 55,
                "match": {"type": "plugin_score", "plugin": "nsfw_cu_v1", "min_score": 0.55},
                "severity": "HIGH",
                "action_hint": "REVIEW",
                "points": 28,
            }
        ],
    }
    out = evaluate(claim)
    assert out["decision"] == "ALLOW"
    assert out["risk"] == 0
