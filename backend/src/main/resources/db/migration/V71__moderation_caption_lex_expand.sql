-- Broaden lex.spam caption bait patterns (for/of/4 nudes, onlyfans, …).
-- Async worker + sync ModerationCaptionGateService both consume these rules.

UPDATE moderation_rules
SET
    match_json = '{
      "type":"lexicon",
      "fields":["ocr_text","speech_text","title","description"],
      "patterns":[
        "\\bfollow\\s*(?:for|of|4)\\s*nudes?\\b",
        "\\bfollow\\s+me\\s+for\\s+nudes?\\b",
        "\\bnudes?\\s+for\\s+follow\\b",
        "\\bfree\\s+nudes?\\b",
        "\\blink\\s+in\\s+bio\\s+for\\s+nudes?\\b",
        "\\bonly\\s*fans\\b",
        "\\btelegram\\s*@\\w+",
        "\\bbit\\.ly/"
      ],
      "flags":"i"
    }'::jsonb,
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 40,
    description = 'Spam / sexual bait captions → BLOCK + auto-ban'
WHERE code = 'lex.spam';

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
  AND r.code = 'lex.spam';
