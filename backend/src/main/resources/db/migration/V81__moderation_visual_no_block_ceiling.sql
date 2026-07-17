-- Visual / tag rules must never hard-BLOCK (false positives → REMOVED posts).
-- Caption lex + originality override still BLOCK when those rules fire.
-- Engine also applies a soft decision ceiling (deploy moderation-worker).

UPDATE moderation_rules
SET
    action_hint = 'REVIEW',
    override_flag = FALSE,
    points = LEAST(points, 30),
    description = COALESCE(description, code) || ' → REVIEW only (V81; no risk-stack BLOCK)',
    updated_at = NOW()
WHERE code IN (
    'plugin.nsfw_cu_v1',
    'plugin.nsfw_cu_v1_review',
    'plugin.violence_cu_v1',
    'plugin.violence_cu_v1_review',
    'tag.adult_hint',
    'tag.violence_visual'
);

UPDATE moderation_rule_versions rv
SET
    action_hint = r.action_hint,
    override_flag = r.override_flag,
    points = r.points,
    description = r.description,
    match_json = r.match_json
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

UPDATE policy_versions
SET notes = 'V81: visual/tag REVIEW-only; soft ceiling in worker; lex/originality override still BLOCK'
WHERE is_active = TRUE;
