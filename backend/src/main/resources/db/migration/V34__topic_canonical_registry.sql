-- Canonical topic registry: map GPT/alias slugs to a single topics row

CREATE TABLE IF NOT EXISTS topic_aliases (
    alias VARCHAR(120) PRIMARY KEY,
    canonical_topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_aliases_canonical ON topic_aliases(canonical_topic_id);

INSERT INTO topics (slug, display_name, description) VALUES
    ('ai', 'AI', 'Artificial intelligence'),
    ('programming', 'Programming', 'Software development'),
    ('electronic_music', 'Electronic Music', 'Electronic and EDM music')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO topic_aliases (alias, canonical_topic_id)
SELECT v.alias, t.id
FROM (VALUES
    ('electronic_music', 'edm'),
    ('electronic-dance-music', 'edm'),
    ('electronic_dance_music', 'edm'),
    ('ed_m', 'edm'),
    ('v_pop', 'vpop'),
    ('v-pop', 'vpop'),
    ('k_pop', 'kpop'),
    ('k-pop', 'kpop'),
    ('j_pop', 'jpop'),
    ('j-pop', 'jpop'),
    ('league_of_legends', 'lol'),
    ('league-of-legends', 'lol'),
    ('counter_strike_2', 'cs2'),
    ('counter-strike-2', 'cs2'),
    ('dota_2', 'dota2'),
    ('openai', 'chatgpt'),
    ('gpt', 'chatgpt'),
    ('spring_boot', 'springboot'),
    ('spring-boot', 'springboot'),
    ('software_engineering', 'programming'),
    ('software-development', 'programming'),
    ('software_development', 'programming'),
    ('code', 'coding'),
    ('developer', 'coding'),
    ('machine_learning', 'ai'),
    ('ml', 'ai'),
    ('artificial_intelligence', 'ai'),
    ('memes', 'meme'),
    ('humor', 'comedy'),
    ('funny_video', 'funny'),
    ('make_up', 'makeup'),
    ('skin_care', 'skincare'),
    ('work_out', 'workout'),
    ('gym_workout', 'workout'),
    ('crypto_currency', 'crypto'),
    ('cryptocurrency', 'crypto'),
    ('stocks', 'stock'),
    ('investing', 'investment'),
    ('ev', 'electric_vehicle'),
    ('electric_car', 'electric_vehicle'),
    ('motorcycles', 'motorcycle'),
    ('cars', 'car'),
    ('anime_cosplay', 'cosplay'),
    ('manga_anime', 'manga')
) AS v(alias, canonical)
JOIN topics t ON t.slug = v.canonical
ON CONFLICT (alias) DO NOTHING;

INSERT INTO topic_relations (parent_topic_id, child_topic_id, relation_type, weight)
SELECT p.id, c.id, 'hierarchy', 1.0
FROM topics p
JOIN topics c ON (
    (p.slug = 'ai' AND c.slug IN ('chatgpt', 'cursor'))
    OR (p.slug = 'programming' AND c.slug IN ('springboot', 'coding', 'software'))
    OR (p.slug = 'technology' AND c.slug IN ('ai', 'programming'))
)
ON CONFLICT DO NOTHING;

UPDATE topics child
SET parent_topic_id = tr.parent_topic_id
FROM topic_relations tr
WHERE child.id = tr.child_topic_id
  AND child.parent_topic_id IS NULL;

INSERT INTO topic_category_mapping (category_id, topic_id, weight)
SELECT c.id, t.id, 1.0
FROM categories c
JOIN topics t ON (
    (c.slug = 'technology' AND t.slug IN ('ai', 'programming'))
)
ON CONFLICT DO NOTHING;
