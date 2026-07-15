-- Vietnamese sexual / genital profanity lexicon for AI policy worker (+ caption gate via DB).
-- Word boundaries use (?i) without \b — Vietnamese diacritics break ASCII \b.

INSERT INTO moderation_rules (
    code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description
)
VALUES (
    'lex.sexual_vi',
    'sexual_content',
    75,
    TRUE,
    '{
      "type":"lexicon",
      "fields":["title","description","ocr_text","speech_text"],
      "patterns":[
        "đầu\\s*buồi",
        "dau\\s*buoi",
        "buồi",
        "buoi",
        "cặc",
        "cak",
        "lồn",
        "loz",
        "lìn",
        "địt\\s*mẹ",
        "dit\\s*me",
        "đụ\\s*mẹ",
        "du\\s*me",
        "đm\\s",
        "vcl",
        "vl\\b",
        "sex\\s*chat",
        "làm\\s*tình",
        "lam\\s*tinh",
        "xem\\s*sex",
        "clip\\s*sex",
        "ảnh\\s*nóng",
        "anh\\s*nong",
        "video\\s*nóng",
        "video\\s*nong"
      ],
      "flags":"i"
    }'::jsonb,
    'HIGH',
    'BLOCK',
    FALSE,
    45,
    'Vietnamese sexual / vulgar caption lexicon → BLOCK + auto-ban'
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
  AND r.code = 'lex.sexual_vi'
ON CONFLICT (policy_version_id, rule_code) DO UPDATE SET
    match_json = EXCLUDED.match_json,
    action_hint = EXCLUDED.action_hint,
    severity = EXCLUDED.severity,
    points = EXCLUDED.points,
    description = EXCLUDED.description,
    label = EXCLUDED.label,
    priority = EXCLUDED.priority;

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban + VI sexual lexicon (lex.sexual_vi)'
WHERE code = '2026.07.1';
