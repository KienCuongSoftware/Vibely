-- Public-facing video identifier (UUIDv7). Internal BIGINT id remains the join key.
ALTER TABLE videos ADD COLUMN IF NOT EXISTS public_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_videos_public_id
    ON videos (public_id)
    WHERE public_id IS NOT NULL;
