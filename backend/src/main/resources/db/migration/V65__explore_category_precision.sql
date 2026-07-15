-- Tighten Explore category precision: drop weak CU memberships and soft mappings
-- that put unrelated videos into Food / Education / Gaming tabs.

-- coding is a tech signal, not education curriculum.
DELETE FROM category_tag_mapping
WHERE id IN (
    SELECT ctm.id
    FROM category_tag_mapping ctm
    JOIN categories c ON c.id = ctm.category_id
    JOIN semantic_tags t ON t.id = ctm.tag_id
    WHERE c.slug = 'education'
      AND t.slug = 'coding'
);

-- Require higher tag confidence before CU can map into noisy Explore tabs.
UPDATE category_tag_mapping
SET min_tag_confidence = GREATEST(min_tag_confidence, 0.72)
WHERE category_id IN (
    SELECT id FROM categories
    WHERE slug IN (
        'food', 'education', 'gaming', 'streetfood', 'mukbang',
        'technology', 'lifestyle', 'viral'
    )
);

-- Remove Explore tab memberships that only came from weak CU projection masses.
DELETE FROM video_categories
WHERE (video_id, category_id) IN (
    SELECT vc.video_id, vc.category_id
    FROM video_categories vc
    JOIN categories c ON c.id = vc.category_id
    JOIN video_category_scores vcs
      ON vcs.video_id = vc.video_id
     AND vcs.category_id = vc.category_id
    WHERE c.slug IN (
        'food', 'education', 'gaming', 'streetfood', 'mukbang',
        'technology', 'lifestyle', 'viral'
    )
      AND vcs.source = 'cu_tags'
      AND vcs.score < 0.90
);

-- Drop forced-edge CU boost leftovers (old code wrote Math.max(1.0, raw*1.5)).
DELETE FROM video_categories
WHERE (video_id, category_id) IN (
    SELECT vc.video_id, vc.category_id
    FROM video_categories vc
    JOIN video_category_scores vcs
      ON vcs.video_id = vc.video_id
     AND vcs.category_id = vc.category_id
    WHERE vcs.source = 'cu_tags'
      AND vc.score >= 1.0
      AND vc.score < 1.20
      AND vcs.score < 0.85
);
