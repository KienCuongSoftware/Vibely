ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN videos.scheduled_at IS
    'When set in the future, video stays off public feed/profile/explore until this instant; Studio Posts still lists it.';

CREATE INDEX IF NOT EXISTS idx_videos_scheduled_at
    ON videos (scheduled_at)
    WHERE scheduled_at IS NOT NULL;
