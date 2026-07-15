-- Content Moderation Phase 4: detector plugin registry + plugin_score rules.
-- Plugins consume stored CU visual/object JSON only — never re-run OCR/Whisper/CLIP/YOLO.

CREATE TABLE IF NOT EXISTS detector_registry (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(64) NOT NULL,
    display_name    VARCHAR(128) NOT NULL,
    artifact_kind   VARCHAR(32) NOT NULL DEFAULT 'heuristic',
    artifact_ref    VARCHAR(512),
    config_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT detector_registry_code_uq UNIQUE (code),
    CONSTRAINT detector_registry_kind_chk CHECK (
        artifact_kind IN ('heuristic', 'onnx', 'torchscript', 'python_module')
    )
);

CREATE INDEX IF NOT EXISTS idx_detector_registry_enabled
    ON detector_registry (enabled) WHERE enabled = TRUE;

INSERT INTO detector_registry (code, display_name, artifact_kind, artifact_ref, config_json, enabled, notes)
VALUES
(
    'nsfw_cu_v1',
    'NSFW CU heuristic v1',
    'heuristic',
    'ai-workers/content-moderation/app/plugins/nsfw_cu_v1.py',
    '{"min_emit":0.25}'::jsonb,
    TRUE,
    'Scores from stored semantic tags, visual tagScores, and text fields — no video re-download'
),
(
    'violence_cu_v1',
    'Violence CU heuristic v1',
    'heuristic',
    'ai-workers/content-moderation/app/plugins/violence_cu_v1.py',
    '{"min_emit":0.25}'::jsonb,
    TRUE,
    'Scores from stored object classCounts, tags, and text — no video re-download'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO moderation_rules (code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description)
VALUES
(
    'plugin.nsfw_cu_v1',
    'sexual_content',
    55,
    TRUE,
    '{"type":"plugin_score","plugin":"nsfw_cu_v1","min_score":0.55}'::jsonb,
    'HIGH',
    'REVIEW',
    FALSE,
    28,
    'Phase 4 NSFW detector plugin on stored CU features'
),
(
    'plugin.violence_cu_v1',
    'violence',
    56,
    TRUE,
    '{"type":"plugin_score","plugin":"violence_cu_v1","min_score":0.55}'::jsonb,
    'HIGH',
    'REVIEW',
    FALSE,
    26,
    'Phase 4 violence detector plugin on stored CU features'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO moderation_rule_versions (
    policy_version_id, rule_code, label, priority, match_json, severity, action_hint, override_flag, points, description
)
SELECT
    pv.id,
    r.code,
    r.label,
    r.priority,
    r.match_json,
    r.severity,
    r.action_hint,
    r.override_flag,
    r.points,
    r.description
FROM policy_versions pv
CROSS JOIN moderation_rules r
WHERE pv.code = '2026.07.1'
  AND r.code IN ('plugin.nsfw_cu_v1', 'plugin.violence_cu_v1')
ON CONFLICT (policy_version_id, rule_code) DO NOTHING;

UPDATE policy_versions
SET notes = 'Phase 1–4: lexicon + originality + detector plugins (nsfw_cu_v1, violence_cu_v1)'
WHERE code = '2026.07.1';
