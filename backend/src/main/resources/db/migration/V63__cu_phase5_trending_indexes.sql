-- Phase 5: speed trending-by-tag-growth queries on video_semantic_tags.created_at
CREATE INDEX IF NOT EXISTS idx_video_semantic_tags_created
    ON video_semantic_tags (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_semantic_tags_tag_created
    ON video_semantic_tags (tag_id, created_at DESC);
