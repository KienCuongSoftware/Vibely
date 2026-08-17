ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP NULL;

COMMENT ON COLUMN refresh_tokens.revoked_at IS
    'When the token was rotated/revoked; a reuse shortly after rotation is treated as a concurrent-request race instead of a stolen token.';

UPDATE refresh_tokens
SET revoked_at = created_at
WHERE revoked = TRUE
  AND revoked_at IS NULL;
