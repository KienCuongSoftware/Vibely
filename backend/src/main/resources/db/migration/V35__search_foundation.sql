-- Search module: history, trends, and PostgreSQL trigram indexes for full-text style lookup.

CREATE TABLE IF NOT EXISTS search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_created
    ON search_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS search_trends (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(200) NOT NULL,
    search_count BIGINT NOT NULL DEFAULT 1,
    last_searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_search_trends_keyword UNIQUE (keyword)
);

CREATE INDEX IF NOT EXISTS idx_search_trends_rank
    ON search_trends(search_count DESC, last_searched_at DESC);

-- Trigram search optimization (PostgreSQL).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_username_trgm
    ON users USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm
    ON users USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_videos_title_trgm
    ON videos USING gin (title gin_trgm_ops);

-- Video caption is stored as videos.description in this schema.
CREATE INDEX IF NOT EXISTS idx_videos_description_trgm
    ON videos USING gin (description gin_trgm_ops);

-- Hashtag display name is stored as hashtags.tag.
CREATE INDEX IF NOT EXISTS idx_hashtags_tag_trgm
    ON hashtags USING gin (tag gin_trgm_ops);
