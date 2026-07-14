ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) NOT NULL DEFAULT 'PUBLIC';

UPDATE videos SET privacy = 'PUBLIC' WHERE privacy IS NULL OR privacy = '';

COMMENT ON COLUMN videos.privacy IS
    'PUBLIC = everyone; FRIENDS = mutual followers; PRIVATE = author only';
