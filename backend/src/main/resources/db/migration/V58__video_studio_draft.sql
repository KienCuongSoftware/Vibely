ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS studio_draft BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN videos.studio_draft IS
    'TRUE while Studio upload draft (before Đăng). Hidden from studio posts list and public feeds.';
