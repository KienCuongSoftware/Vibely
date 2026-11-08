-- False positive: accent-stripped "Buổi" (session/meeting) matched \\bbuoi\\b (vulgar buồi).
-- Keep accented "buồi" and compounds "đầu buồi" / "dau buoi"; drop standalone no-accent "buoi".

UPDATE moderation_rules
SET
    match_json = jsonb_set(
        match_json,
        '{patterns}',
        COALESCE(
            (
                SELECT jsonb_agg(elem)
                FROM jsonb_array_elements(match_json -> 'patterns') AS elem
                WHERE lower(elem #>> '{}') NOT IN (
                    'buoi',
                    '\bbuoi\b',
                    E'\\bbuoi\\b'
                )
            ),
            '[]'::jsonb
        )
    ),
    description = 'VI/EN sexual lexicon (no bare buoi — avoids Buổi FP) → BLOCK',
    updated_at = NOW()
WHERE code = 'lex.sexual_vi'
  AND COALESCE(match_json ->> 'type', '') = 'lexicon'
  AND match_json ? 'patterns';

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban + caption lex without bare buoi FP'
WHERE is_active = TRUE;
