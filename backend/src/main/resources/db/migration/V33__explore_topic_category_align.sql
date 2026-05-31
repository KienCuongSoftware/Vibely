-- Align discovery schema with two-layer Explore model (topics = classification, categories = navigation)

ALTER TABLE category_topic_map RENAME TO topic_category_mapping;

ALTER TABLE topics ADD COLUMN IF NOT EXISTS description VARCHAR(500);

INSERT INTO topics (slug, display_name, description) VALUES
    ('food', 'Food', 'Cooking and cuisine'),
    ('travel', 'Travel', 'Travel and destinations'),
    ('dance', 'Dance', 'Dance and choreography'),
    ('beauty', 'Beauty', 'Beauty and cosmetics'),
    ('comedy', 'Comedy', 'Humor and comedy'),
    ('fashion', 'Fashion', 'Fashion and outfits'),
    ('sports', 'Sports', 'Sports and athletics'),
    ('pets', 'Pets', 'Pets and animal care'),
    ('news', 'News', 'News and current events'),
    ('education', 'Education', 'Education and learning'),
    ('family', 'Family', 'Family and parenting'),
    ('lifestyle', 'Lifestyle', 'Lifestyle and daily life'),
    ('art', 'Art', 'Art and creative design'),
    ('finance', 'Finance', 'Finance and investing'),
    ('automotive', 'Automotive', 'Cars and vehicles'),
    ('vehicles', 'Vehicles', 'Cars and vehicles'),
    ('technology', 'Technology', 'Technology and software'),
    ('fitness', 'Fitness', 'Fitness and workouts'),
    ('gaming', 'Gaming', 'Gaming and esports'),
    ('jpop', 'J-Pop', 'Japanese pop music'),
    ('programming', 'Programming', 'Software development'),
    ('software', 'Software', 'Software products'),
    ('coding', 'Coding', 'Programming tutorials'),
    ('esports', 'Esports', 'Competitive gaming'),
    ('gaming_news', 'Gaming News', 'Gaming industry news'),
    ('family_life', 'Family Life', 'Family moments'),
    ('parenting', 'Parenting', 'Parenting tips'),
    ('tutorial', 'Tutorial', 'How-to tutorials'),
    ('learning', 'Learning', 'Learning content'),
    ('funny', 'Funny', 'Funny clips'),
    ('meme', 'Meme', 'Memes and viral humor'),
    ('makeup', 'Makeup', 'Makeup tutorials'),
    ('skincare', 'Skincare', 'Skincare routines'),
    ('daily_life', 'Daily Life', 'Day-in-the-life content'),
    ('productivity', 'Productivity', 'Productivity tips'),
    ('drawing', 'Drawing', 'Drawing and illustration'),
    ('painting', 'Painting', 'Painting and fine art'),
    ('creative_design', 'Creative Design', 'Design and creativity'),
    ('choreography', 'Choreography', 'Dance choreography'),
    ('investment', 'Investment', 'Investing and markets'),
    ('stock', 'Stock Market', 'Stocks and trading'),
    ('crypto', 'Crypto', 'Cryptocurrency'),
    ('football', 'Football', 'Football and soccer'),
    ('basketball', 'Basketball', 'Basketball highlights'),
    ('mma', 'MMA', 'Mixed martial arts'),
    ('outfit', 'Outfit', 'Outfit inspiration'),
    ('dog', 'Dogs', 'Dog content'),
    ('cat', 'Cats', 'Cat content'),
    ('pet_care', 'Pet Care', 'Pet care tips'),
    ('breaking_news', 'Breaking News', 'Breaking news'),
    ('car', 'Cars', 'Car reviews and culture'),
    ('motorcycle', 'Motorcycle', 'Motorcycles'),
    ('electric_vehicle', 'Electric Vehicle', 'EVs and electric cars'),
    ('workout', 'Workout', 'Workout routines'),
    ('nutrition', 'Nutrition', 'Nutrition and diet'),
    ('league_of_legends', 'League of Legends', 'League of Legends'),
    ('dota2', 'Dota 2', 'Dota 2')
ON CONFLICT (slug) DO UPDATE SET
    description = COALESCE(EXCLUDED.description, topics.description);

INSERT INTO topic_category_mapping (category_id, topic_id, weight)
SELECT c.id, t.id, 1.0
FROM categories c
JOIN topics t ON (
    (c.slug = 'music' AND t.slug IN (
        'music', 'edm', 'remix', 'vpop', 'kpop', 'jpop', 'rock', 'karaoke', 'lyrics'
    ))
    OR (c.slug = 'food' AND t.slug IN (
        'food', 'recipe', 'street_food', 'vietnamese_food'
    ))
    OR (c.slug = 'anime' AND t.slug IN ('anime', 'manga', 'cosplay'))
    OR (c.slug = 'technology' AND t.slug IN (
        'technology', 'ai', 'chatgpt', 'cursor', 'programming', 'software', 'coding', 'springboot'
    ))
    OR (c.slug = 'gaming' AND t.slug IN (
        'gaming', 'valorant', 'lol', 'league_of_legends', 'dota2', 'cs2', 'esports', 'gaming_news'
    ))
    OR (c.slug = 'family' AND t.slug IN ('family', 'family_life', 'parenting'))
    OR (c.slug = 'education' AND t.slug IN ('education', 'tutorial', 'learning'))
    OR (c.slug = 'comedy' AND t.slug IN ('comedy', 'funny', 'meme'))
    OR (c.slug = 'beauty' AND t.slug IN ('beauty', 'makeup', 'skincare'))
    OR (c.slug = 'lifestyle' AND t.slug IN ('lifestyle', 'daily_life', 'productivity'))
    OR (c.slug = 'art' AND t.slug IN ('art', 'drawing', 'painting', 'creative_design'))
    OR (c.slug = 'dance' AND t.slug IN ('dance', 'choreography'))
    OR (c.slug = 'finance' AND t.slug IN ('finance', 'investment', 'stock', 'crypto'))
    OR (c.slug = 'fitness' AND t.slug IN ('fitness', 'gym', 'workout', 'bodybuilding', 'nutrition'))
    OR (c.slug = 'sports' AND t.slug IN ('sports', 'football', 'basketball', 'mma'))
    OR (c.slug = 'fashion' AND t.slug IN ('fashion', 'outfit'))
    OR (c.slug = 'pets' AND t.slug IN ('pets', 'dog', 'cat', 'pet_care'))
    OR (c.slug = 'news' AND t.slug IN ('news', 'breaking_news'))
    OR (c.slug = 'automotive' AND t.slug IN ('automotive', 'vehicles', 'car', 'motorcycle', 'electric_vehicle'))
    OR (c.slug = 'travel' AND t.slug = 'travel')
)
ON CONFLICT DO NOTHING;
