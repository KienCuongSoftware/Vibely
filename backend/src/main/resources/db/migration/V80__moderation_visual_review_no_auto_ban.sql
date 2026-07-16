-- Stop false account bans from visual CLIP / OCR noise.
-- Auto-ban stays for caption lex only (handled in Java). Visual → REVIEW queue.

UPDATE moderation_rules
SET
    action_hint = 'REVIEW',
    points = 30,
    description = 'NSFW visual detector → REVIEW (no auto-ban; false positives common)'
WHERE code IN ('plugin.nsfw_cu_v1', 'plugin.nsfw_cu_v1_review');

UPDATE moderation_rules
SET
    action_hint = 'REVIEW',
    points = 30,
    description = 'Violence visual detector → REVIEW (no auto-ban)'
WHERE code IN ('plugin.violence_cu_v1', 'plugin.violence_cu_v1_review');

UPDATE moderation_rules
SET
    action_hint = 'REVIEW',
    points = 30,
    description = 'Adult visual tags → REVIEW (no auto-ban)'
WHERE code IN ('tag.adult_hint', 'tag.violence_visual');

-- Caption lex only — never OCR/speech (noise false-matches sexual patterns).
UPDATE moderation_rules
SET match_json = jsonb_set(
    match_json,
    '{fields}',
    '["description"]'::jsonb
),
    updated_at = NOW()
WHERE enabled = TRUE
  AND COALESCE(match_json->>'type', '') = 'lexicon'
  AND match_json ? 'fields';

UPDATE moderation_rule_versions rv
SET
    match_json = r.match_json,
    action_hint = r.action_hint,
    points = r.points,
    description = r.description
FROM moderation_rules r, policy_versions pv
WHERE rv.rule_code = r.code
  AND rv.policy_version_id = pv.id
  AND pv.is_active = TRUE
  AND r.code IN (
      'plugin.nsfw_cu_v1',
      'plugin.nsfw_cu_v1_review',
      'plugin.violence_cu_v1',
      'plugin.violence_cu_v1_review',
      'tag.adult_hint',
      'tag.violence_visual'
  );

UPDATE moderation_rule_versions rv
SET match_json = r.match_json
FROM moderation_rules r, policy_versions pv
WHERE rv.rule_code = r.code
  AND rv.policy_version_id = pv.id
  AND pv.is_active = TRUE
  AND COALESCE(r.match_json->>'type', '') = 'lexicon';

UPDATE policy_versions
SET notes = 'Visual REVIEW-only; lex caption-only fields; AI auto-ban caption-only (V80)'
WHERE is_active = TRUE;
