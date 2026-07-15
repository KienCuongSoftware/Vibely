-- Escalate sexual / violence / spam caption rules to BLOCK so AI removes video
-- and (with APP_MODERATION_AUTO_BAN_ON_BLOCK) bans the author.

UPDATE moderation_rules
SET
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 40,
    description = 'Spam / scam bait lexicon → BLOCK video + auto-ban author when apply-decisions'
WHERE code = 'lex.spam';

UPDATE moderation_rules
SET
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 45,
    description = 'Strong adult semantic tags → BLOCK + auto-ban'
WHERE code = 'tag.adult_hint';

UPDATE moderation_rules
SET
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 45,
    description = 'NSFW detector plugin → BLOCK + auto-ban',
    match_json = '{"type":"plugin_score","plugin":"nsfw_cu_v1","min_score":0.55}'::jsonb
WHERE code = 'plugin.nsfw_cu_v1';

UPDATE moderation_rules
SET
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 45,
    description = 'Violence detector plugin → BLOCK + auto-ban',
    match_json = '{"type":"plugin_score","plugin":"violence_cu_v1","min_score":0.55}'::jsonb
WHERE code = 'plugin.violence_cu_v1';

UPDATE moderation_rule_versions rv
SET
    action_hint = r.action_hint,
    severity = r.severity,
    points = r.points,
    description = r.description,
    match_json = r.match_json
FROM moderation_rules r, policy_versions pv
WHERE rv.rule_code = r.code
  AND rv.policy_version_id = pv.id
  AND pv.code = '2026.07.1'
  AND r.code IN ('lex.spam', 'tag.adult_hint', 'plugin.nsfw_cu_v1', 'plugin.violence_cu_v1');

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban: spam/nsfw/violence → BLOCK (+ ban author when apply-decisions)'
WHERE code = '2026.07.1';
