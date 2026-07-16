-- Reduce false auto-bans on normal videos: raise visual BLOCK floors.
-- Soft CLIP cues must not ban accounts; only strong NSFW/violence signals.

UPDATE moderation_rules
SET
    match_json = '{"type":"plugin_score","plugin":"nsfw_cu_v1","min_score":0.72}'::jsonb,
    action_hint = 'BLOCK',
    points = 50,
    description = 'NSFW detector — strong score only (≥0.72) → BLOCK + auto-ban'
WHERE code = 'plugin.nsfw_cu_v1';

UPDATE moderation_rules
SET
    match_json = '{"type":"plugin_score","plugin":"violence_cu_v1","min_score":0.72}'::jsonb,
    action_hint = 'BLOCK',
    points = 50,
    description = 'Violence detector — strong score only (≥0.72) → BLOCK + auto-ban'
WHERE code = 'plugin.violence_cu_v1';

UPDATE moderation_rules
SET
    match_json = '{"type":"semantic_tags","slugs":["nsfw","explicit","porn","adult_content","adult","nudity"],"min_confidence":0.72}'::jsonb,
    description = 'Strong adult visual semantic tags (≥0.72) → BLOCK + auto-ban'
WHERE code = 'tag.adult_hint';

UPDATE moderation_rules
SET
    match_json = '{"type":"semantic_tags","slugs":["violence","gore","weapon","guns","blood"],"min_confidence":0.72}'::jsonb,
    description = 'Strong violence visual tags (≥0.72) → BLOCK + auto-ban'
WHERE code = 'tag.violence_visual';

-- Mid-score visual → human REVIEW (no auto-ban). Soft insert for NSFW band.
INSERT INTO moderation_rules (
    code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description
) VALUES (
    'plugin.nsfw_cu_v1_review',
    'sexual_content',
    84,
    TRUE,
    '{"type":"plugin_score","plugin":"nsfw_cu_v1","min_score":0.48,"max_score":0.719}'::jsonb,
    'MEDIUM',
    'REVIEW',
    FALSE,
    28,
    'Borderline NSFW visual (0.48–0.72) → REVIEW only, no auto-ban'
)
ON CONFLICT (code) DO UPDATE
SET
    match_json = EXCLUDED.match_json,
    action_hint = EXCLUDED.action_hint,
    points = EXCLUDED.points,
    description = EXCLUDED.description,
    enabled = TRUE,
    updated_at = NOW();

INSERT INTO moderation_rules (
    code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description
) VALUES (
    'plugin.violence_cu_v1_review',
    'violence',
    85,
    TRUE,
    '{"type":"plugin_score","plugin":"violence_cu_v1","min_score":0.48,"max_score":0.719}'::jsonb,
    'MEDIUM',
    'REVIEW',
    FALSE,
    28,
    'Borderline violence visual (0.48–0.72) → REVIEW only, no auto-ban'
)
ON CONFLICT (code) DO UPDATE
SET
    match_json = EXCLUDED.match_json,
    action_hint = EXCLUDED.action_hint,
    points = EXCLUDED.points,
    description = EXCLUDED.description,
    enabled = TRUE,
    updated_at = NOW();

UPDATE moderation_rule_versions rv
SET
    match_json = r.match_json,
    action_hint = r.action_hint,
    severity = r.severity,
    points = r.points,
    description = r.description
FROM moderation_rules r, policy_versions pv
WHERE rv.rule_code = r.code
  AND rv.policy_version_id = pv.id
  AND pv.is_active = TRUE
  AND r.code IN (
      'plugin.nsfw_cu_v1',
      'plugin.violence_cu_v1',
      'tag.adult_hint',
      'tag.violence_visual',
      'plugin.nsfw_cu_v1_review',
      'plugin.violence_cu_v1_review'
  );

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
WHERE pv.is_active = TRUE
  AND r.code IN ('plugin.nsfw_cu_v1_review', 'plugin.violence_cu_v1_review')
ON CONFLICT (policy_version_id, rule_code) DO UPDATE
SET
    match_json = EXCLUDED.match_json,
    action_hint = EXCLUDED.action_hint,
    points = EXCLUDED.points,
    description = EXCLUDED.description;

UPDATE policy_versions
SET notes = 'Raise visual BLOCK floors (V79) — mid scores go to REVIEW, not auto-ban'
WHERE is_active = TRUE;
