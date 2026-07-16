-- Policy: text lex examines caption (+ OCR/speech from video), never upload title/filename.
UPDATE moderation_rules
SET match_json = jsonb_set(
    match_json,
    '{fields}',
    '["description","ocr_text","speech_text"]'::jsonb
),
    description = CASE
        WHEN code = 'lex.sexual_vi' THEN
            'VI/EN sexual lexicon on caption + OCR/speech (not title/filename) → BLOCK'
        WHEN code = 'lex.violence_vi' THEN
            'VI/EN violence lexicon on caption + OCR/speech (not title/filename) → BLOCK'
        ELSE description
    END,
    updated_at = NOW()
WHERE enabled = TRUE
  AND COALESCE(match_json->>'type', '') = 'lexicon'
  AND match_json ? 'fields';

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban + caption-only text lex (no title/filename)'
WHERE is_active = TRUE;
