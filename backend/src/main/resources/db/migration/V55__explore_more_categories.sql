-- Expand Explore with many more category tabs + matching topics/mappings.
-- Videos land in these via hashtag/keyword classifier and discovery indexing.

INSERT INTO categories (slug, name, enabled)
VALUES
    ('horror', 'Kinh dị', TRUE),
    ('romance', 'Tình cảm', TRUE),
    ('action', 'Hành động', TRUE),
    ('thriller', 'Giật gân', TRUE),
    ('scifi', 'Khoa học viễn tưởng', TRUE),
    ('movies', 'Phim ảnh', TRUE),
    ('documentary', 'Phim tài liệu', TRUE),
    ('meme', 'Meme', TRUE),
    ('prank', 'Prank', TRUE),
    ('challenge', 'Thử thách', TRUE),
    ('reaction', 'Reaction', TRUE),
    ('asmr', 'ASMR', TRUE),
    ('motivation', 'Động lực', TRUE),
    ('diy', 'DIY', TRUE),
    ('nature', 'Thiên nhiên', TRUE),
    ('photography', 'Nhiếp ảnh', TRUE),
    ('magic', 'Ảo thuật', TRUE),
    ('cosplay', 'Cosplay', TRUE),
    ('books', 'Sách', TRUE),
    ('science', 'Khoa học', TRUE),
    ('history', 'Lịch sử', TRUE),
    ('language', 'Ngoại ngữ', TRUE),
    ('health', 'Sức khỏe', TRUE),
    ('kids', 'Trẻ em', TRUE),
    ('wedding', 'Đám cưới', TRUE),
    ('relationships', 'Mối quan hệ', TRUE),
    ('career', 'Sự nghiệp', TRUE),
    ('realestate', 'Bất động sản', TRUE),
    ('camping', 'Cắm trại', TRUE),
    ('fishing', 'Câu cá', TRUE),
    ('farming', 'Nông nghiệp', TRUE),
    ('unboxing', 'Unboxing', TRUE),
    ('review', 'Review', TRUE),
    ('podcast', 'Podcast', TRUE),
    ('instruments', 'Nhạc cụ', TRUE),
    ('kpop', 'K-Pop', TRUE),
    ('vpop', 'V-Pop', TRUE),
    ('mukbang', 'Mukbang', TRUE),
    ('streetfood', 'Ẩm thực đường phố', TRUE),
    ('spirituality', 'Tâm linh', TRUE),
    ('viral', 'Viral', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    enabled = EXCLUDED.enabled,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO topics (slug, display_name)
VALUES
    ('horror', 'Horror'),
    ('kinh_di', 'Kinh dị'),
    ('romance', 'Romance'),
    ('tinh_cam', 'Tình cảm'),
    ('action', 'Action'),
    ('hanh_dong', 'Hành động'),
    ('thriller', 'Thriller'),
    ('scifi', 'Sci-Fi'),
    ('movies', 'Movies'),
    ('phim', 'Phim'),
    ('documentary', 'Documentary'),
    ('meme', 'Meme'),
    ('prank', 'Prank'),
    ('challenge', 'Challenge'),
    ('reaction', 'Reaction'),
    ('asmr', 'ASMR'),
    ('motivation', 'Motivation'),
    ('diy', 'DIY'),
    ('nature', 'Nature'),
    ('thien_nhien', 'Thiên nhiên'),
    ('photography', 'Photography'),
    ('magic', 'Magic'),
    ('ao_thuat', 'Ảo thuật'),
    ('books', 'Books'),
    ('science', 'Science'),
    ('history', 'History'),
    ('language', 'Language'),
    ('ngoai_ngu', 'Ngoại ngữ'),
    ('health', 'Health'),
    ('suc_khoe', 'Sức khỏe'),
    ('kids', 'Kids'),
    ('wedding', 'Wedding'),
    ('relationships', 'Relationships'),
    ('career', 'Career'),
    ('realestate', 'Real Estate'),
    ('camping', 'Camping'),
    ('fishing', 'Fishing'),
    ('farming', 'Farming'),
    ('unboxing', 'Unboxing'),
    ('review', 'Review'),
    ('podcast', 'Podcast'),
    ('instruments', 'Instruments'),
    ('mukbang', 'Mukbang'),
    ('streetfood', 'Street Food'),
    ('spirituality', 'Spirituality'),
    ('viral', 'Viral'),
    ('horror_movie', 'Horror Movie'),
    ('ghost', 'Ghost'),
    ('true_crime', 'True Crime')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO topic_category_mapping (category_id, topic_id, weight)
SELECT c.id, t.id, 1.0
FROM categories c
JOIN topics t ON (
    (c.slug = 'horror' AND t.slug IN ('horror', 'kinh_di', 'horror_movie', 'ghost', 'true_crime', 'thriller'))
    OR (c.slug = 'romance' AND t.slug IN ('romance', 'tinh_cam', 'relationships', 'wedding'))
    OR (c.slug = 'action' AND t.slug IN ('action', 'hanh_dong'))
    OR (c.slug = 'thriller' AND t.slug IN ('thriller', 'horror', 'true_crime'))
    OR (c.slug = 'scifi' AND t.slug IN ('scifi', 'science'))
    OR (c.slug = 'movies' AND t.slug IN ('movies', 'phim', 'documentary', 'horror_movie'))
    OR (c.slug = 'documentary' AND t.slug IN ('documentary', 'history', 'science'))
    OR (c.slug = 'meme' AND t.slug IN ('meme', 'viral', 'comedy'))
    OR (c.slug = 'prank' AND t.slug IN ('prank', 'comedy'))
    OR (c.slug = 'challenge' AND t.slug IN ('challenge', 'viral', 'dance'))
    OR (c.slug = 'reaction' AND t.slug IN ('reaction'))
    OR (c.slug = 'asmr' AND t.slug IN ('asmr'))
    OR (c.slug = 'motivation' AND t.slug IN ('motivation', 'career'))
    OR (c.slug = 'diy' AND t.slug IN ('diy', 'art'))
    OR (c.slug = 'nature' AND t.slug IN ('nature', 'thien_nhien', 'camping', 'fishing', 'farming'))
    OR (c.slug = 'photography' AND t.slug IN ('photography', 'art'))
    OR (c.slug = 'magic' AND t.slug IN ('magic', 'ao_thuat'))
    OR (c.slug = 'cosplay' AND t.slug IN ('cosplay', 'anime', 'manga'))
    OR (c.slug = 'books' AND t.slug IN ('books', 'education'))
    OR (c.slug = 'science' AND t.slug IN ('science', 'scifi', 'education'))
    OR (c.slug = 'history' AND t.slug IN ('history', 'documentary', 'education'))
    OR (c.slug = 'language' AND t.slug IN ('language', 'ngoai_ngu', 'education'))
    OR (c.slug = 'health' AND t.slug IN ('health', 'suc_khoe', 'fitness', 'nutrition'))
    OR (c.slug = 'kids' AND t.slug IN ('kids', 'family', 'family_life', 'parenting'))
    OR (c.slug = 'wedding' AND t.slug IN ('wedding', 'relationships', 'romance'))
    OR (c.slug = 'relationships' AND t.slug IN ('relationships', 'romance', 'tinh_cam'))
    OR (c.slug = 'career' AND t.slug IN ('career', 'motivation', 'productivity'))
    OR (c.slug = 'realestate' AND t.slug IN ('realestate', 'finance', 'investment'))
    OR (c.slug = 'camping' AND t.slug IN ('camping', 'nature', 'travel'))
    OR (c.slug = 'fishing' AND t.slug IN ('fishing', 'nature'))
    OR (c.slug = 'farming' AND t.slug IN ('farming', 'nature'))
    OR (c.slug = 'unboxing' AND t.slug IN ('unboxing', 'review', 'technology'))
    OR (c.slug = 'review' AND t.slug IN ('review', 'unboxing'))
    OR (c.slug = 'podcast' AND t.slug IN ('podcast'))
    OR (c.slug = 'instruments' AND t.slug IN ('instruments', 'music', 'karaoke'))
    OR (c.slug = 'kpop' AND t.slug IN ('kpop', 'music', 'dance'))
    OR (c.slug = 'vpop' AND t.slug IN ('vpop', 'music', 'lyrics'))
    OR (c.slug = 'mukbang' AND t.slug IN ('mukbang', 'food', 'street_food'))
    OR (c.slug = 'streetfood' AND t.slug IN ('streetfood', 'street_food', 'food', 'vietnamese_food'))
    OR (c.slug = 'spirituality' AND t.slug IN ('spirituality'))
    OR (c.slug = 'viral' AND t.slug IN ('viral', 'meme', 'challenge'))
    OR (c.slug = 'anime' AND t.slug IN ('cosplay'))
    OR (c.slug = 'comedy' AND t.slug IN ('meme', 'prank'))
    OR (c.slug = 'music' AND t.slug IN ('instruments', 'kpop', 'vpop'))
    OR (c.slug = 'food' AND t.slug IN ('mukbang', 'streetfood'))
)
ON CONFLICT DO NOTHING;

INSERT INTO topic_aliases (alias, canonical_topic_id)
SELECT v.alias, t.id
FROM (VALUES
    ('kinhdi', 'horror'),
    ('kinh_di', 'horror'),
    ('horror_movie', 'horror'),
    ('ma', 'horror'),
    ('ghost', 'horror'),
    ('phimkinhdi', 'horror'),
    ('tinhcam', 'romance'),
    ('tinh_cam', 'romance'),
    ('love', 'romance'),
    ('hanhdong', 'action'),
    ('hanh_dong', 'action'),
    ('khoahocvientuong', 'scifi'),
    ('sci_fi', 'scifi'),
    ('sci-fi', 'scifi'),
    ('phim', 'movies'),
    ('movie', 'movies'),
    ('film', 'movies'),
    ('phimtailieu', 'documentary'),
    ('aothuat', 'magic'),
    ('magic_trick', 'magic'),
    ('thiennhien', 'nature'),
    ('outdoors', 'nature'),
    ('nhiepanh', 'photography'),
    ('photo', 'photography'),
    ('ngoaingu', 'language'),
    ('english', 'language'),
    ('tienganh', 'language'),
    ('suckhoe', 'health'),
    ('wellness', 'health'),
    ('treem', 'kids'),
    ('baby', 'kids'),
    ('damcuoi', 'wedding'),
    ('moiquanhe', 'relationships'),
    ('dating', 'relationships'),
    ('suknghiep', 'career'),
    ('batdongsan', 'realestate'),
    ('bds', 'realestate'),
    ('camtrai', 'camping'),
    ('cauca', 'fishing'),
    ('nongnghiep', 'farming'),
    ('amthucduongpho', 'streetfood'),
    ('street_food', 'streetfood'),
    ('tamlinh', 'spirituality'),
    ('trending', 'viral'),
    ('fyp', 'viral'),
    ('xuhuong', 'viral')
) AS v(alias, canonical_slug)
JOIN topics t ON t.slug = v.canonical_slug
ON CONFLICT (alias) DO NOTHING;
