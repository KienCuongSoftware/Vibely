ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS explore_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS explore_score_updated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hashtags (
    id BIGSERIAL PRIMARY KEY,
    tag VARCHAR(80) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_categories (
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, category_id)
);

CREATE TABLE IF NOT EXISTS video_hashtags (
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    hashtag_id BIGINT NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_video_categories_category_score_video
    ON video_categories(category_id, score DESC, video_id DESC);

CREATE INDEX IF NOT EXISTS idx_video_hashtags_hashtag_video
    ON video_hashtags(hashtag_id, video_id DESC);

CREATE INDEX IF NOT EXISTS idx_videos_explore_rank
    ON videos(status, explore_score DESC, created_at DESC, id DESC);

INSERT INTO categories(slug, name, enabled)
VALUES
    ('all', 'Tất cả', TRUE),
    ('music', 'Âm nhạc', TRUE),
    ('dance', 'Nhảy', TRUE),
    ('beauty', 'Làm đẹp', TRUE),
    ('fashion', 'Thời trang', TRUE),
    ('food', 'Ẩm thực', TRUE),
    ('travel', 'Du lịch', TRUE),
    ('sports', 'Thể thao', TRUE),
    ('fitness', 'Thể hình', TRUE),
    ('gaming', 'Gaming', TRUE),
    ('comedy', 'Hài hước', TRUE),
    ('pets', 'Thú cưng', TRUE),
    ('education', 'Giáo dục', TRUE),
    ('technology', 'Công nghệ', TRUE),
    ('news', 'Tin tức', TRUE),
    ('lifestyle', 'Lifestyle', TRUE),
    ('family', 'Gia đình', TRUE),
    ('automotive', 'Xe cộ', TRUE),
    ('art', 'Nghệ thuật', TRUE),
    ('finance', 'Tài chính', TRUE),
    ('anime', 'Anime', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    enabled = EXCLUDED.enabled,
    updated_at = CURRENT_TIMESTAMP;
