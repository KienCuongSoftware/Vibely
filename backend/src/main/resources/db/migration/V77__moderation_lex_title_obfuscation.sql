-- Caption/title obfuscations: underscores, no-diacritic (Video_Tinh_Duc, tinh-duc, …)
UPDATE moderation_rules
SET match_json = jsonb_set(
    match_json,
    '{patterns}',
    (
        SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY ord), '[]'::jsonb)
        FROM (
            SELECT p, MIN(ord) AS ord
            FROM (
                SELECT jsonb_array_elements_text(match_json->'patterns') AS p, 1 AS ord
                UNION ALL
                SELECT unnest(ARRAY[
                    'tinh[\\s_\\-]*duc',
                    'tình[\\s_\\-]*dục',
                    'video[\\s_\\-]*tinh[\\s_\\-]*duc',
                    'video[\\s_\\-]*tình[\\s_\\-]*dục',
                    'quan[\\s_\\-]*he[\\s_\\-]*tinh[\\s_\\-]*duc',
                    'quan[\\s_\\-]*hệ[\\s_\\-]*tình[\\s_\\-]*dục',
                    'noi[\\s_\\-]*dung[\\s_\\-]*18\\+',
                    'noi[\\s_\\-]*dung[\\s_\\-]*nguoi[\\s_\\-]*lon',
                    'adult[\\s_\\-]*video',
                    'sex[\\s_\\-]*video',
                    'porn[\\s_\\-]*video'
                ]) AS p, 2 AS ord
            ) all_p
            GROUP BY p
        ) uniq
    )
),
    description = 'VI/EN sexual lexicon + title obfuscations (underscore / no-diacritic) → BLOCK',
    updated_at = NOW()
WHERE code = 'lex.sexual_vi';

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban + title obfuscation sexual lex (V77)',
    updated_at = NOW()
WHERE is_active = TRUE;
