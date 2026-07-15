-- CU moderation visual tags (CLIP zero-shot) + lower visual BLOCK thresholds.
-- Requires rebuilt content-understanding worker (vocab_catalog.py via build_vocab.py).

INSERT INTO semantic_tags (slug, name, language, status) VALUES
    ('nsfw', 'NSFW', 'und', 'active'),
    ('explicit', 'Explicit Content', 'und', 'active'),
    ('porn', 'Pornography', 'und', 'active'),
    ('adult_content', 'Adult Content', 'und', 'active'),
    ('adult', 'Adult', 'und', 'active'),
    ('nudity', 'Nudity', 'und', 'active'),
    ('lingerie', 'Lingerie', 'und', 'active'),
    ('seductive', 'Seductive', 'und', 'active'),
    ('kissing', 'Kissing', 'und', 'active'),
    ('violence', 'Violence', 'und', 'active'),
    ('gore', 'Gore', 'und', 'active'),
    ('weapon', 'Weapon', 'und', 'active'),
    ('guns', 'Guns', 'und', 'active'),
    ('blood', 'Blood', 'und', 'active')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    status = 'active',
    updated_at = NOW();

-- Strong adult CLIP/YOLO tags → BLOCK at lower confidence.
UPDATE moderation_rules
SET
    match_json = '{"type":"semantic_tags","slugs":["nsfw","explicit","porn","adult_content","adult","nudity"],"min_confidence":0.55}'::jsonb,
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 45,
    description = 'Strong adult visual semantic tags → BLOCK + auto-ban'
WHERE code = 'tag.adult_hint';

INSERT INTO moderation_rules (
    code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description
) VALUES (
    'tag.violence_visual',
    'violence',
    72,
    TRUE,
    '{"type":"semantic_tags","slugs":["violence","gore","weapon","guns","blood"],"min_confidence":0.55}'::jsonb,
    'HIGH',
    'BLOCK',
    FALSE,
    45,
    'Strong violence / gore / weapon visual tags → BLOCK + auto-ban'
)
ON CONFLICT (code) DO UPDATE
SET
    label = EXCLUDED.label,
    priority = EXCLUDED.priority,
    enabled = EXCLUDED.enabled,
    match_json = EXCLUDED.match_json,
    severity = EXCLUDED.severity,
    action_hint = EXCLUDED.action_hint,
    points = EXCLUDED.points,
    description = EXCLUDED.description;

-- Lower plugin_score floors so single-frame CLIP/YOLO cues can BLOCK.
UPDATE moderation_rules
SET
    match_json = '{"type":"plugin_score","plugin":"nsfw_cu_v1","min_score":0.42}'::jsonb,
    description = 'NSFW detector plugin (visual + text) → BLOCK + auto-ban'
WHERE code = 'plugin.nsfw_cu_v1';

UPDATE moderation_rules
SET
    match_json = '{"type":"plugin_score","plugin":"violence_cu_v1","min_score":0.42}'::jsonb,
    description = 'Violence detector plugin (visual + text) → BLOCK + auto-ban'
WHERE code = 'plugin.violence_cu_v1';

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
  AND r.code = 'tag.violence_visual'
ON CONFLICT (policy_version_id, rule_code) DO UPDATE
SET
    label = EXCLUDED.label,
    priority = EXCLUDED.priority,
    match_json = EXCLUDED.match_json,
    severity = EXCLUDED.severity,
    action_hint = EXCLUDED.action_hint,
    points = EXCLUDED.points,
    description = EXCLUDED.description;

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
  AND pv.code = '2026.07.1'
  AND r.code IN ('tag.adult_hint', 'plugin.nsfw_cu_v1', 'plugin.violence_cu_v1');

UPDATE policy_versions
SET notes = 'Phase 1–4 + visual NSFW/violence CLIP vocab (V75) + lower plugin thresholds'
WHERE code = '2026.07.1';
