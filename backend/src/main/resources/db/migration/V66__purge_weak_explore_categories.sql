-- Purge noisy Explore category memberships leftover from soft hybrid / weak CU / single-keyword.
-- Explore tabs now only trust strong video_categories (hashtag or multi-keyword; score >= 2.0).

DELETE FROM video_categories
WHERE category_id IN (
        SELECT id FROM categories
        WHERE slug IN (
            'food', 'education', 'gaming', 'streetfood', 'mukbang',
            'technology', 'lifestyle', 'viral', 'comedy', 'meme'
        )
    )
  AND score < 2.0;

-- Soft discovery scores under these tabs are too leaky for Explore chips.
DELETE FROM video_category_scores
WHERE category_id IN (
        SELECT id FROM categories
        WHERE slug IN (
            'food', 'education', 'gaming', 'streetfood', 'mukbang',
            'technology', 'lifestyle', 'viral', 'comedy', 'meme'
        )
    )
  AND score < 0.80;
