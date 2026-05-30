-- Seed topic graph roots, hierarchy, and category-topic presentation mappings

INSERT INTO topics (slug, display_name) VALUES
    ('music', 'Music'),
    ('gaming', 'Gaming'),
    ('technology', 'Technology'),
    ('food', 'Food'),
    ('fitness', 'Fitness'),
    ('anime', 'Anime'),
    ('edm', 'EDM'),
    ('vpop', 'V-Pop'),
    ('kpop', 'K-Pop'),
    ('rock', 'Rock'),
    ('karaoke', 'Karaoke'),
    ('valorant', 'Valorant'),
    ('lol', 'League of Legends'),
    ('dota2', 'Dota 2'),
    ('cs2', 'Counter-Strike 2'),
    ('ai', 'AI'),
    ('chatgpt', 'ChatGPT'),
    ('cursor', 'Cursor'),
    ('springboot', 'Spring Boot'),
    ('recipe', 'Recipe'),
    ('street_food', 'Street Food'),
    ('vietnamese_food', 'Vietnamese Food'),
    ('gym', 'Gym'),
    ('bodybuilding', 'Bodybuilding'),
    ('manga', 'Manga'),
    ('cosplay', 'Cosplay'),
    ('remix', 'Remix'),
    ('lyrics', 'Lyrics')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO topic_relations (parent_topic_id, child_topic_id, relation_type, weight)
SELECT p.id, c.id, 'hierarchy', 1.0
FROM topics p
JOIN topics c ON (
    (p.slug = 'music' AND c.slug IN ('edm', 'vpop', 'kpop', 'rock', 'karaoke', 'remix', 'lyrics'))
    OR (p.slug = 'gaming' AND c.slug IN ('valorant', 'lol', 'dota2', 'cs2'))
    OR (p.slug = 'technology' AND c.slug IN ('ai', 'chatgpt', 'cursor', 'springboot'))
    OR (p.slug = 'food' AND c.slug IN ('recipe', 'street_food', 'vietnamese_food'))
    OR (p.slug = 'fitness' AND c.slug IN ('gym', 'bodybuilding'))
    OR (p.slug = 'anime' AND c.slug IN ('manga', 'cosplay'))
)
ON CONFLICT DO NOTHING;

UPDATE topics child
SET parent_topic_id = tr.parent_topic_id
FROM topic_relations tr
WHERE child.id = tr.child_topic_id;

INSERT INTO category_topic_map (category_id, topic_id, weight)
SELECT c.id, t.id, 1.0
FROM categories c
JOIN topics t ON (
    (c.slug = 'music' AND t.slug IN ('music', 'edm', 'vpop', 'kpop', 'rock', 'karaoke', 'remix', 'lyrics'))
    OR (c.slug = 'gaming' AND t.slug IN ('gaming', 'valorant', 'lol', 'dota2', 'cs2'))
    OR (c.slug = 'technology' AND t.slug IN ('technology', 'ai', 'chatgpt', 'cursor', 'springboot'))
    OR (c.slug = 'food' AND t.slug IN ('food', 'recipe', 'street_food', 'vietnamese_food'))
    OR (c.slug = 'fitness' AND t.slug IN ('fitness', 'gym', 'bodybuilding'))
    OR (c.slug = 'anime' AND t.slug IN ('anime', 'manga', 'cosplay'))
    OR (c.slug = 'dance' AND t.slug = 'dance')
    OR (c.slug = 'travel' AND t.slug = 'travel')
    OR (c.slug = 'beauty' AND t.slug = 'beauty')
    OR (c.slug = 'comedy' AND t.slug = 'comedy')
    OR (c.slug = 'fashion' AND t.slug = 'fashion')
    OR (c.slug = 'sports' AND t.slug = 'sports')
    OR (c.slug = 'pets' AND t.slug = 'pets')
    OR (c.slug = 'news' AND t.slug = 'news')
    OR (c.slug = 'education' AND t.slug = 'education')
    OR (c.slug = 'family' AND t.slug = 'family')
    OR (c.slug = 'lifestyle' AND t.slug = 'lifestyle')
    OR (c.slug = 'art' AND t.slug = 'art')
    OR (c.slug = 'finance' AND t.slug = 'finance')
    OR (c.slug = 'automotive' AND t.slug IN ('automotive', 'vehicles'))
)
ON CONFLICT DO NOTHING;
