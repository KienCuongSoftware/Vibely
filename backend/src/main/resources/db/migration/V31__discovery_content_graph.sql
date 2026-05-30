-- Discovery / content understanding foundation (topics = source of truth, categories = presentation)

CREATE TABLE IF NOT EXISTS topics (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    display_name VARCHAR(160) NOT NULL,
    parent_topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_topic_id);

CREATE TABLE IF NOT EXISTS topic_relations (
    parent_topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    child_topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relation_type VARCHAR(32) NOT NULL DEFAULT 'hierarchy',
    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (parent_topic_id, child_topic_id)
);

CREATE TABLE IF NOT EXISTS video_topics (
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL DEFAULT 'AI',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_video_topics_topic_score ON video_topics(topic_id, score DESC, video_id DESC);

CREATE TABLE IF NOT EXISTS category_topic_map (
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    PRIMARY KEY (category_id, topic_id)
);

CREATE TABLE IF NOT EXISTS video_category_scores (
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL DEFAULT 'AI',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_video_category_scores_cat ON video_category_scores(category_id, score DESC, video_id DESC);

CREATE TABLE IF NOT EXISTS video_content_understanding (
    video_id BIGINT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    model VARCHAR(80) NOT NULL,
    payload_json TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL DEFAULT 'OPENAI',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_embeddings (
    video_id BIGINT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    model VARCHAR(80) NOT NULL,
    dimensions INT NOT NULL,
    embedding_json TEXT NOT NULL,
    source_text_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_engagement_stats (
    video_id BIGINT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    views BIGINT NOT NULL DEFAULT 0,
    watch_time_ms BIGINT NOT NULL DEFAULT 0,
    completion_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    rewatch_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    share_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    save_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    comment_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    follow_conversion_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    engagement_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    explore_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    ranking_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_engagement_ranking ON video_engagement_stats(ranking_score DESC, video_id DESC);

CREATE TABLE IF NOT EXISTS user_topic_interests (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    signal_count BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_interests_user ON user_topic_interests(user_id, score DESC);

ALTER TABLE videos ADD COLUMN IF NOT EXISTS ranking_score DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS idx_videos_ranking_rank ON videos(status, ranking_score DESC NULLS LAST, created_at DESC, id DESC);
