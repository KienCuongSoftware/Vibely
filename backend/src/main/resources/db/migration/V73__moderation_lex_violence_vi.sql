-- Vietnamese violence / threat lexicon for AI policy worker (+ caption gate via DB).

INSERT INTO moderation_rules (
    code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description
)
VALUES (
    'lex.violence_vi',
    'violence',
    76,
    TRUE,
    '{
      "type":"lexicon",
      "fields":["title","description","ocr_text","speech_text"],
      "patterns":[
        "giết\\s*người",
        "giet\\s*nguoi",
        "giết\\s*chết",
        "giet\\s*chet",
        "ám\\s*sát",
        "am\\s*sat",
        "thảm\\s*sát",
        "tham\\s*sat",
        "khủng\\s*bố",
        "khung\\s*bo",
        "đặt\\s*bom",
        "dat\\s*bom",
        "chém\\s*giết",
        "chem\\s*giet",
        "đâm\\s*chết",
        "dam\\s*chet",
        "bắn\\s*chết",
        "ban\\s*chet",
        "i\\s*will\\s*kill",
        "kill\\s*you",
        "kill\\s*people"
      ],
      "flags":"i"
    }'::jsonb,
    'HIGH',
    'BLOCK',
    FALSE,
    45,
    'Vietnamese / EN violence threat lexicon → BLOCK + auto-ban'
)
ON CONFLICT (code) DO UPDATE SET
    match_json = EXCLUDED.match_json,
    action_hint = EXCLUDED.action_hint,
    severity = EXCLUDED.severity,
    points = EXCLUDED.points,
    description = EXCLUDED.description,
    enabled = TRUE,
    label = EXCLUDED.label,
    priority = EXCLUDED.priority;

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
  AND r.code = 'lex.violence_vi'
ON CONFLICT (policy_version_id, rule_code) DO UPDATE SET
    match_json = EXCLUDED.match_json,
    action_hint = EXCLUDED.action_hint,
    severity = EXCLUDED.severity,
    points = EXCLUDED.points,
    description = EXCLUDED.description,
    label = EXCLUDED.label,
    priority = EXCLUDED.priority;

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban + VI sexual/violence lexicons'
WHERE code = '2026.07.1';
