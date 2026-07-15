#!/usr/bin/env python3
"""Build CU vocabulary catalog + Flyway seed.

Run from repo root:
  python ai-workers/content-understanding/scripts/build_vocab.py
"""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORKER_APP = ROOT / "ai-workers" / "content-understanding" / "app"
MIGRATION = ROOT / "backend" / "src" / "main" / "resources" / "db" / "migration" / "V64__cu_vocab_expansion.sql"

# (slug, name, explore_category_or_None, keywords[list], aliases[(alias,lang)], clip_prompts[list])
# Keep keywords >= 3 chars when possible; short ones rely on word-boundary matcher.


def _t(
    slug: str,
    name: str,
    category: str | None,
    keywords: list[str],
    aliases: list[tuple[str, str]] | None = None,
    clip: list[str] | None = None,
):
    return {
        "slug": slug,
        "name": name,
        "category": category,
        "keywords": keywords,
        "aliases": aliases or [],
        "clip": clip or [f"a video about {name}", f"{name} content"],
    }


TAGS: list[dict] = []


def add(*rows: dict) -> None:
    TAGS.extend(rows)


# --- Core / legacy (keep + enrich) ---
add(
    _t("anime", "Anime", "anime", ["anime", "manga", "waifu", "naruto", "onepiece", "アニメ", "アニメーション", "hoathinhnhat"], [("hoathinhnhat", "vi"), ("hoạt hình nhật", "vi")], ["anime illustration", "anime character art", "japanese animation"]),
    _t("manga", "Manga", "anime", ["manga", "manhwa", "manhua", "comic art"], [("truyện tranh", "vi")], ["manga comic art", "manga drawing"]),
    _t("cosplay", "Cosplay", "cosplay", ["cosplay", "cosplayer", "costumes"], [], ["cosplay costume", "person in anime cosplay"]),
    _t("music", "Music", "music", ["music", "lyrics", "song", "amnhac", "nhac", "音楽", "nhạc", "baihat", "bài hát"], [("amnhac", "vi"), ("âm nhạc", "vi")], ["music video", "person singing", "musical performance"]),
    _t("lofi", "Lofi", "music", ["lofi", "lo-fi", "chillhop", "chill beats"], [("chill", "en")], ["lofi aesthetic room", "chill study aesthetic"]),
    _t("lyrics", "Lyrics", "music", ["lyrics", "loi bai hat", "lời bài hát", "lyric video"], [], ["song lyrics on screen", "lyric video text"]),
    _t("kpop", "K-Pop", "kpop", ["kpop", "k-pop", "bts", "blackpink", "twice", "straykids", "idol korea"], [("nhac han", "vi")], ["k-pop idol performance", "korean pop dance stage"]),
    _t("vpop", "V-Pop", "vpop", ["vpop", "v-pop", "nhạc việt", "nhac viet", "son tung", "hoang thuy linh"], [], ["vietnamese pop music video", "v-pop singer"]),
    _t("instruments", "Instruments", "instruments", ["guitar", "piano", "violin", "drum", "ukulele", "saxophone", "nhạc cụ", "nhac cu"], [("nhạc cụ", "vi")], ["person playing musical instrument", "guitar performance"]),
    _t("karaoke", "Karaoke", "music", ["karaoke", "hát karaoke", "hat karaoke"], [], ["karaoke singing", "people singing karaoke"]),
    _t("cover", "Cover Song", "music", ["cover song", "covermusic", "hát cover", "hat cover"], [], ["music cover performance", "singer covering a song"]),
    _t("edm", "EDM", "music", ["edm", "electronic dance", "techno", "house music", "dubstep"], [], ["edm festival lights", "electronic dance music stage"]),
    _t("rap", "Rap", "music", ["rap", "hiphop", "hip-hop", "rapper", "freestyle rap"], [], ["rapper performing", "hip hop music video"]),
    _t("horror", "Horror", "horror", ["horror", "ghost", "kinhdi", "kinh dị", "creepy", "ホラー", "truyenma", "truyện ma", "ma quái", "maquai", "true horror"], [("kinhdi", "vi"), ("kinh dị", "vi"), ("truyện ma", "vi")], ["horror scene", "scary dark atmosphere", "creepy image"]),
    _t("thriller", "Thriller", "thriller", ["thriller", "giật gân", "giat gan", "suspense"], [], ["thriller movie scene", "suspenseful dark scene"]),
    _t("true_crime", "True Crime", "horror", ["true crime", "truecrime", "an mang", "án mạng"], [], ["true crime documentary style", "crime investigation footage"]),
    _t("gaming", "Gaming", "gaming", ["gaming", "gameplay", "gamer", "esports", "stream game"], [("game", "en")], ["video game gameplay", "gaming screen", "esports match"]),
    _t("valorant", "Valorant", "gaming", ["valorant", "valo"], [], ["valorant gameplay", "valorant fps match"]),
    _t("league_of_legends", "League of Legends", "gaming", ["league of legends", "lienminh", "liên minh", "lol game"], [("lienminh", "vi")], ["league of legends gameplay", "moba match screen"]),
    _t("minecraft", "Minecraft", "gaming", ["minecraft", "mcpe", "mine craft"], [], ["minecraft gameplay", "minecraft building"]),
    _t("freefire", "Free Fire", "gaming", ["freefire", "free fire", "ff max"], [], ["free fire gameplay", "garena free fire"]),
    _t("pubg", "PUBG", "gaming", ["pubg", "battlegrounds", "bgmi"], [], ["pubg gameplay", "battle royale shooting"]),
    _t("genshin", "Genshin Impact", "gaming", ["genshin", "genshin impact", "hoyoverse"], [], ["genshin impact gameplay", "anime style open world game"]),
    _t("roblox", "Roblox", "gaming", ["roblox"], [], ["roblox gameplay", "roblox avatar world"]),
    _t("mobile_legends", "Mobile Legends", "gaming", ["mobile legends", "mlbb", "lienquan", "liên quân"], [("lienquan", "vi")], ["mobile legends gameplay", "mlbb match"]),
    _t("food", "Food", "food", ["food", "amthuc", "ẩm thực", "an uong", "ăn uống", "đồ ăn", "do an", "cooking food"], [("amthuc", "vi"), ("ẩm thực", "vi"), ("đồ ăn", "vi")], ["vietnamese food", "street food dish", "cooking food"]),
    _t("mukbang", "Mukbang", "mukbang", ["mukbang", "an mukbang", "ăn mukbang", "eatwithme"], [], ["mukbang eating show", "person eating large meal"]),
    _t("street_food", "Street Food", "streetfood", ["street food", "streetfood", "an vat", "ăn vặt", "quan via he", "quán vỉa hè"], [("ăn vặt", "vi")], ["vietnamese street food", "street vendor food"]),
    _t("vietnamese_food", "Vietnamese Food", "food", ["pho", "phở", "bun bo", "bún bò", "banh mi", "bánh mì", "com tam", "cơm tấm", "bun cha", "bún chả"], [], ["vietnamese pho bowl", "banh mi sandwich"]),
    _t("cooking", "Cooking", "food", ["cooking", "nau an", "nấu ăn", "recipe", "cong thuc", "công thức"], [("nấu ăn", "vi")], ["home cooking", "chef preparing food"]),
    _t("dessert", "Dessert", "food", ["dessert", "banh ngot", "bánh ngọt", "cake", "cookies", "che", "chè"], [], ["dessert cake", "sweet dessert plating"]),
    _t("coffee", "Coffee", "food", ["coffee", "cafe", "cà phê", "ca phe", "espresso", "latte"], [("cà phê", "vi")], ["coffee cup", "cafe latte art"]),
    _t("travel", "Travel", "travel", ["travel", "dulich", "du lịch", "dalat", "đà lạt", "beach trip", "du lich"], [("dulich", "vi"), ("du lịch", "vi")], ["travel scenery", "beach landscape", "city travel vlog"]),
    _t("camping", "Camping", "camping", ["camping", "cam trai", "cắm trại", "tent", "picnic"], [("cắm trại", "vi")], ["camping tent outdoors", "campfire night"]),
    _t("nature", "Nature", "nature", ["nature", "thien nhien", "thiên nhiên", "forest", "waterfall", "doi nui"], [("thiên nhiên", "vi")], ["beautiful nature landscape", "forest waterfall"]),
    _t("fishing", "Fishing", "fishing", ["fishing", "cau ca", "câu cá", "angler"], [("câu cá", "vi")], ["person fishing", "fishing by the lake"]),
    _t("farming", "Farming", "farming", ["farming", "nong nghiep", "nông nghiệp", "nong trai", "nông trại", "rua cay"], [("nông nghiệp", "vi")], ["farming field", "farmer working crops"]),
    _t("comedy", "Comedy", "comedy", ["comedy", "funny", "haihuoc", "hài hước", "hài", "standup"], [("hài", "vi"), ("hài hước", "vi")], ["funny comedy sketch", "people laughing"]),
    _t("meme", "Meme", "meme", ["meme", "shitpost", "dank meme"], [], ["internet meme image", "funny meme format"]),
    _t("prank", "Prank", "prank", ["prank", "tro dua", "trò đùa", "pranking"], [], ["prank video", "people pranking"]),
    _t("challenge", "Challenge", "challenge", ["challenge", "thu thach", "thử thách", "trend challenge"], [("thử thách", "vi")], ["social media challenge", "people doing a challenge"]),
    _t("reaction", "Reaction", "reaction", ["reaction", "react", "phan ung", "phản ứng"], [], ["reaction video face", "person reacting to video"]),
    _t("viral", "Viral", "viral", ["viral", "trending video", "clip hot"], [], ["viral social media clip"]),
    _t("education", "Education", "education", ["education", "tutorial", "learning", "hoc", "học", "bai giang", "bài giảng"], [("học", "vi")], ["classroom lecture", "educational tutorial screen"]),
    _t("coding", "Coding", "technology", ["coding", "laptrinh", "lập trình", "programmer", "docker", "postgresql", "python code", "javascript"], [("laptrinh", "vi"), ("lập trình", "vi"), ("java", "en")], ["programmer at computer", "code on screen"]),
    _t("technology", "Technology", "technology", ["technology", "tech", "cong nghe", "công nghệ", "gadget"], [("công nghệ", "vi")], ["tech gadgets", "modern technology devices"]),
    _t("ai", "Artificial Intelligence", "technology", ["artificial intelligence", "chatgpt", "machine learning", "ai tool", "openai"], [("tri tue nhan tao", "vi")], ["artificial intelligence concept", "ai robot interface"]),
    _t("unboxing", "Unboxing", "unboxing", ["unboxing", "mo hop", "mở hộp"], [("mở hộp", "vi")], ["product unboxing", "opening a package"]),
    _t("review", "Review", "review", ["review", "danh gia", "đánh giá", "tren tay"], [("đánh giá", "vi")], ["product review", "person reviewing gadget"]),
    _t("beauty", "Beauty", "beauty", ["beauty", "makeup", "skincare", "lam dep", "làm đẹp", "my pham", "mỹ phẩm"], [("làm đẹp", "vi")], ["beauty makeup tutorial", "skincare routine"]),
    _t("makeup", "Makeup", "beauty", ["makeup", "trang diem", "trang điểm", "eyeliner", "lipstick"], [("trang điểm", "vi")], ["makeup application", "beauty makeup closeup"]),
    _t("skincare", "Skincare", "beauty", ["skincare", "cham soc da", "chăm sóc da", "serum", "moisturizer"], [("chăm sóc da", "vi")], ["skincare products", "facial skincare routine"]),
    _t("fashion", "Fashion", "fashion", ["fashion", "outfit", "ootd", "thoi trang", "thời trang", "style"], [("thời trang", "vi")], ["fashion outfit", "street style clothing"]),
    _t("fitness", "Fitness", "fitness", ["fitness", "gym", "workout", "tap gym", "tập gym", "bodybuilding"], [], ["gym workout", "person exercising fitness"]),
    _t("yoga", "Yoga", "fitness", ["yoga", "pilates", "stretching"], [], ["yoga pose", "person doing yoga"]),
    _t("sports", "Sports", "sports", ["sports", "the thao", "thể thao", "athlete"], [("thể thao", "vi")], ["sports match", "athletes competing"]),
    _t("football", "Football", "sports", ["football", "soccer", "bongda", "bóng đá", "fifa"], [("bóng đá", "vi")], ["football soccer match", "soccer players"]),
    _t("basketball", "Basketball", "sports", ["basketball", "bong ro", "bóng rổ", "nba"], [("bóng rổ", "vi")], ["basketball game", "dunk basketball"]),
    _t("mma", "MMA", "sports", ["mma", "ufc", "boxing", "kickboxing", "muay thai"], [], ["mma fight", "boxing match"]),
    _t("family", "Family", "family", ["family", "gia dinh", "gia đình", "family life", "parenting"], [("gia đình", "vi")], ["happy family together", "family home life"]),
    _t("kids", "Kids", "kids", ["kids", "tre em", "trẻ em", "baby", "em be", "em bé", "toddler"], [("trẻ em", "vi")], ["children playing", "cute baby"]),
    _t("pets", "Pets", "pets", ["pets", "thu cung", "thú cưng", "pet care"], [("thú cưng", "vi")], ["cute pet animals", "pet care"]),
    _t("cat", "Cat", "pets", ["cat", "meo", "mèo", "kitten", "meow"], [("mèo", "vi")], ["a photo of a cat", "cute cat"]),
    _t("dog", "Dog", "pets", ["dog", "cho", "chó", "puppy", "corgi"], [("chó", "vi")], ["a photo of a dog", "cute dog"]),
    _t("night", "Night", "lifestyle", ["night", "dem khuya", "đêm khuya", "midnight", "city night"], [("đêm", "vi")], ["night city lights", "dark night scene"]),
    _t("sad", "Sad", "lifestyle", ["sad", "buon", "buồn", "melancholy", "tam trạng buồn"], [("buồn", "vi")], ["sad emotional scene", "melancholy mood"]),
    _t("city", "City", "travel", ["city", "thanh pho", "thành phố", "saigon", "hanoi", "hà nội", "urban"], [("thành phố", "vi")], ["city skyline", "urban street"]),
    _t("rain", "Rain", "nature", ["rain", "mua", "mưa", "rainy", "mưa rơi"], [("mưa", "vi")], ["rainy weather", "rain on window"]),
    _t("girl", "Girl", "lifestyle", ["girl", "con gai", "cô gái", "women portrait"], [("cô gái", "vi")], ["young woman portrait", "girl selfie"]),
    _t("boy", "Boy", "lifestyle", ["boy", "con trai", "chàng trai", "men portrait"], [("chàng trai", "vi")], ["young man portrait", "boy selfie"]),
)

# --- Entertainment / film ---
add(
    _t("movies", "Movies", "movies", ["movie", "movies", "phim", "cinema", "film review"], [("phim", "vi")], ["movie cinema scene", "film still"]),
    _t("documentary", "Documentary", "documentary", ["documentary", "phim tai lieu", "phim tài liệu"], [], ["documentary footage", "documentary interview"]),
    _t("action", "Action", "action", ["action movie", "hanh dong", "hành động", "action scene"], [("hành động", "vi")], ["action movie fight", "explosive action scene"]),
    _t("romance", "Romance", "romance", ["romance", "tinh cam", "tình cảm", "love story", "ngon tinh"], [("tình cảm", "vi")], ["romantic couple", "romance movie scene"]),
    _t("scifi", "Sci-Fi", "scifi", ["scifi", "sci-fi", "khoa hoc vien tuong", "science fiction"], [], ["science fiction scene", "futuristic sci-fi"]),
    _t("magic", "Magic", "magic", ["magic", "ao thuat", "ảo thuật", "magician", "card trick"], [("ảo thuật", "vi")], ["magician performing trick", "stage magic"]),
    _t("dance", "Dance", "dance", ["dance", "nhay", "nhảy", "choreography", "dance cover", "kpop dance"], [("nhảy", "vi")], ["people dancing", "dance choreography"]),
    _t("art", "Art", "art", ["art", "drawing", "painting", "sketch", "ve tranh", "vẽ tranh"], [("vẽ", "vi")], ["artist drawing", "painting artwork"]),
    _t("photography", "Photography", "photography", ["photography", "nhiep anh", "nhiếp ảnh", "photographer", "camera gear"], [("nhiếp ảnh", "vi")], ["photographer with camera", "photography session"]),
    _t("diy", "DIY", "diy", ["diy", "handmade", "do it yourself", "thu cong", "thủ công"], [], ["diy craft project", "handmade crafting"]),
    _t("asmr", "ASMR", "asmr", ["asmr", "tingles", "whisper asmr"], [], ["asmr microphone closeup", "asmr whispering"]),
)

# --- Lifestyle / society ---
add(
    _t("lifestyle", "Lifestyle", "lifestyle", ["lifestyle", "daily vlog", "cuoc song", "cuộc sống", "day in my life"], [], ["daily lifestyle vlog", "everyday life scenes"]),
    _t("motivation", "Motivation", "motivation", ["motivation", "motivational", "dong luc", "động lực", "inspiration"], [("động lực", "vi")], ["motivational speech", "inspirational success"]),
    _t("career", "Career", "career", ["career", "su nghiep", "sự nghiệp", "job tips", "interview tips"], [("sự nghiệp", "vi")], ["office career work", "professional workplace"]),
    _t("finance", "Finance", "finance", ["finance", "investment", "chung khoan", "chứng khoán", "tai chinh", "tài chính", "money tips"], [("tài chính", "vi")], ["finance charts", "money investment"]),
    _t("crypto", "Crypto", "finance", ["crypto", "bitcoin", "ethereum", "nft", "blockchain"], [], ["cryptocurrency charts", "bitcoin trading"]),
    _t("realestate", "Real Estate", "realestate", ["realestate", "real estate", "bat dong san", "bất động sản", "can ho", "căn hộ"], [("bất động sản", "vi")], ["real estate apartment", "house property tour"]),
    _t("health", "Health", "health", ["health", "suc khoe", "sức khỏe", "healthy living", "wellness"], [("sức khỏe", "vi")], ["healthy lifestyle", "medical wellness"]),
    _t("nutrition", "Nutrition", "health", ["nutrition", "dinh duong", "dinh dưỡng", "diet", "calorie"], [("dinh dưỡng", "vi")], ["healthy nutrition meal", "balanced diet food"]),
    _t("relationships", "Relationships", "relationships", ["relationships", "dating tips", "tinh yeu", "tình yêu", "relationship advice"], [], ["couple relationship", "dating couple"]),
    _t("wedding", "Wedding", "wedding", ["wedding", "dam cuoi", "đám cưới", "bride", "groom", "vu quy"], [("đám cưới", "vi")], ["wedding ceremony", "bride and groom"]),
    _t("spirituality", "Spirituality", "spirituality", ["spirituality", "meditation", "mindfulness", "spiritual", "thien"], [], ["meditation spirituality", "peaceful mindfulness"]),
    _t("podcast", "Podcast", "podcast", ["podcast", "talkshow", "audio talk"], [], ["podcast microphone", "people recording podcast"]),
    _t("books", "Books", "books", ["books", "reading", "sach", "sách", "booktok", "book review"], [("sách", "vi")], ["person reading book", "stack of books"]),
    _t("science", "Science", "science", ["science", "khoa hoc", "khoa học", "physics", "chemistry", "biology"], [("khoa học", "vi")], ["science laboratory", "scientific experiment"]),
    _t("history", "History", "history", ["history", "lich su", "lịch sử", "historical"], [("lịch sử", "vi")], ["historical documentary", "history museum"]),
    _t("language", "Language Learning", "language", ["language learning", "english learning", "ngoai ngu", "ngoại ngữ", "ielts", "toeic"], [("ngoại ngữ", "vi")], ["language learning classroom", "english study"]),
    _t("news", "News", "news", ["news", "breaking news", "tin tuc", "tin tức", "thoi su", "thời sự"], [("tin tức", "vi")], ["news broadcast", "news reporter"]),
    _t("automotive", "Automotive", "automotive", ["automotive", "car review", "xe hơi", "xe hoi", "supercar"], [], ["car automotive", "vehicle on road"]),
    _t("motorcycle", "Motorcycle", "automotive", ["motorcycle", "xe may", "xe máy", "motorbike", "motor"], [("xe máy", "vi")], ["motorcycle on street", "motorbike rider"]),
    _t("electric_vehicle", "Electric Vehicle", "automotive", ["electric vehicle", "ev car", "tesla", "vinfast", "xe điện", "xe dien"], [], ["electric car", "ev charging station"]),
)

# --- Mood / aesthetic / extra niches ---
add(
    _t("aesthetic", "Aesthetic", "lifestyle", ["aesthetic", "aesthetics", "soft girl", "dark academia"], [], ["aesthetic photography", "aesthetic room decor"]),
    _t("vlog", "Vlog", "lifestyle", ["vlog", "daily vlog", "grwm", "get ready with me"], [], ["personal vlog", "vlogger talking to camera"]),
    _t("grwm", "GRWM", "beauty", ["grwm", "get ready with me", "ready with me"], [], ["get ready with me makeup", "morning grwm routine"]),
    _t("haul", "Haul", "fashion", ["haul", "shopping haul", "shein haul", "order haul"], [], ["shopping haul clothes", "package haul"]),
    _t("storytime", "Storytime", "comedy", ["storytime", "story time", "kể chuyện", "ke chuyen"], [], ["person telling story to camera"]),
    _t("pov", "POV", "viral", ["pov", "point of view", "pov video"], [], ["pov first person video"]),
    _t("satisfying", "Satisfying", "asmr", ["satisfying", "oddly satisfying", "slime"], [], ["oddly satisfying video", "satisfying slime"]),
    _t("lifehacks", "Life Hacks", "diy", ["lifehack", "life hacks", "meo hay", "mẹo hay", "tips and tricks"], [("mẹo hay", "vi")], ["life hack tip", "useful lifehack demo"]),
    _t("cleaning", "Cleaning", "lifestyle", ["cleaning", "don dep", "dọn dẹp", "clean with me"], [("dọn dẹp", "vi")], ["home cleaning", "cleaning room"]),
    _t("interior", "Interior Design", "lifestyle", ["interior design", "home decor", "decor phong", "nội thất", "noi that"], [], ["interior design room", "home decoration"]),
    _t("garden", "Garden", "nature", ["garden", "gardening", "trong cay", "trồng cây", "cay canh", "cây cảnh"], [("trồng cây", "vi")], ["garden plants", "home gardening"]),
    _t("beach", "Beach", "travel", ["beach", "bien", "biển", "seaside", "ocean"], [("biển", "vi")], ["beach ocean waves", "seaside vacation"]),
    _t("mountain", "Mountain", "travel", ["mountain", "nui", "núi", "trekking", "hiking"], [("núi", "vi")], ["mountain hiking", "mountain landscape"]),
    _t("foodtour", "Food Tour", "food", ["food tour", "foodtour", "an khap", "ăn khắp", "checkin quan"], [], ["food tour street", "restaurant hopping"]),
    _t("bakery", "Bakery", "food", ["bakery", "tiem banh", "tiệm bánh", "bread", "banh mi ngot"], [], ["bakery bread", "pastry bakery"]),
    _t("seafood", "Seafood", "food", ["seafood", "hai san", "hải sản", "sushi", "sashimi"], [("hải sản", "vi")], ["seafood platter", "sushi seafood"]),
    _t("bbq", "BBQ", "food", ["bbq", "barbecue", "nuong", "nướng", "grill"], [("nướng", "vi")], ["barbecue grill", "bbq meat"]),
    _t("hotpot", "Hotpot", "food", ["hotpot", "lau", "lẩu", "shabu"], [("lẩu", "vi")], ["hotpot boiling", "asian hotpot"]),
    _t("drinks", "Drinks", "food", ["drinks", "cocktail", "mocktail", "tra sua", "trà sữa", "bubble tea"], [("trà sữa", "vi")], ["colorful drinks", "bubble tea cup"]),
    _t("wine", "Wine", "food", ["wine", "ruou vang", "rượu vang", "wine tasting"], [], ["wine glass tasting", "wine bottle"]),
)

# --- Tech / creator tools / more games ---
add(
    _t("smartphone", "Smartphone", "technology", ["smartphone", "iphone", "android phone", "dien thoai", "điện thoại"], [("điện thoại", "vi")], ["smartphone closeup", "mobile phone review"]),
    _t("laptop", "Laptop", "technology", ["laptop", "macbook", "notebook pc"], [], ["laptop computer", "working on laptop"]),
    _t("pc_build", "PC Build", "technology", ["pc build", "custom pc", "rgb pc", "gaming pc"], [], ["custom pc build", "rgb gaming computer"]),
    _t("software", "Software", "technology", ["software", "app review", "saas", "phan mem", "phần mềm"], [], ["software interface", "app on screen"]),
    _t("cybersecurity", "Cybersecurity", "technology", ["cybersecurity", "hacking ethical", "infosec", "bao mat", "bảo mật"], [], ["cybersecurity concept", "digital security"]),
    _t("fortnite", "Fortnite", "gaming", ["fortnite"], [], ["fortnite gameplay"]),
    _t("gta", "GTA", "gaming", ["gta", "gta5", "gta v", "gta online"], [], ["gta gameplay", "gta5 city"]),
    _t("fps", "FPS Games", "gaming", ["fps game", "first person shooter", "cs2", "counter strike", "call of duty"], [], ["fps shooter gameplay"]),
    _t("moba", "MOBA", "gaming", ["moba", "dota", "arena of valor"], [], ["moba game match"]),
    _t("indie_game", "Indie Game", "gaming", ["indie game", "indiegame"], [], ["indie game footage"]),
    _t("speedrun", "Speedrun", "gaming", ["speedrun", "world record run"], [], ["game speedrun timer"]),
    _t("streamer", "Streamer", "gaming", ["streamer", "twitch", "live stream", "streaming setup"], [], ["streamer setup", "live streaming desk"]),
)

# --- Music subgenres / culture ---
add(
    _t("rock", "Rock", "music", ["rock music", "rock band", "metal music", "punk rock"], [], ["rock band concert", "electric guitar rock"]),
    _t("jazz", "Jazz", "music", ["jazz", "jazz music", "saxophone jazz"], [], ["jazz performance", "jazz club music"]),
    _t("classical", "Classical", "music", ["classical music", "orchestra", "symphony", "nhac giao huong"], [], ["classical orchestra", "piano classical"]),
    _t("ballad", "Ballad", "music", ["ballad", "nhạc ballad", "love ballad"], [], ["emotional ballad performance"]),
    _t("remix", "Remix", "music", ["remix", "mashup", "dj remix"], [], ["dj remix booth", "music remix"]),
    _t("ost", "OST", "music", ["ost", "soundtrack", "nhạc phim", "nhac phim"], [("nhạc phim", "vi")], ["movie soundtrack", "film ost"]),
    _t("dance_challenge", "Dance Challenge", "dance", ["dance challenge", "viral dance", "trend dance"], [], ["viral dance challenge"]),
    _t("ballet", "Ballet", "dance", ["ballet", "balle"], [], ["ballet dancer", "ballet performance"]),
)

# --- Vietnam places / culture ---
add(
    _t("vietnam", "Vietnam", "travel", ["vietnam", "viet nam", "việt nam", "vietnamese"], [("việt nam", "vi")], ["vietnam travel", "vietnamese culture"]),
    _t("hanoi", "Hanoi", "travel", ["hanoi", "ha noi", "hà nội", "hoan kiem"], [("hà nội", "vi")], ["hanoi old quarter", "hanoi street"]),
    _t("saigon", "Saigon", "travel", ["saigon", "ho chi minh", "sài gòn", "sai gon", "hcm city"], [("sài gòn", "vi")], ["saigon city nights", "ho chi minh city"]),
    _t("danang", "Da Nang", "travel", ["danang", "da nang", "đà nẵng", "cau rong"], [("đà nẵng", "vi")], ["da nang beach city"]),
    _t("dalat", "Da Lat", "travel", ["dalat", "da lat", "đà lạt", "da lat trip"], [("đà lạt", "vi")], ["da lat pine hills", "da lat travel"]),
    _t("phuquoc", "Phu Quoc", "travel", ["phu quoc", "phú quốc", "dao phu quoc"], [("phú quốc", "vi")], ["phu quoc island beach"]),
    _t("halong", "Ha Long", "travel", ["ha long", "halong", "hạ long", "vinh ha long"], [("hạ long", "vi")], ["ha long bay boats"]),
    _t("tet", "Tet Holiday", "lifestyle", ["tet", "tết", "tet nguyen dan", "lunar new year vietnam"], [("tết", "vi")], ["vietnamese tet celebration", "tet holiday family"]),
    _t("mid_autumn", "Mid-Autumn", "lifestyle", ["mid autumn", "tet trung thu", "tết trung thu", "mooncake"], [("trung thu", "vi")], ["mid autumn festival lanterns"]),
)

# --- Animals / nature extra ---
add(
    _t("bird", "Bird", "pets", ["bird", "chim", "parrot", "sparrow"], [], ["bird perched", "cute bird"]),
    _t("fish", "Fish", "pets", ["aquarium", "ca canh", "cá cảnh", "fish tank"], [("cá cảnh", "vi")], ["aquarium fish", "colorful fish"]),
    _t("rabbit", "Rabbit", "pets", ["rabbit", "bunny", "tho", "thỏ"], [("thỏ", "vi")], ["cute rabbit", "bunny pet"]),
    _t("hamster", "Hamster", "pets", ["hamster"], [], ["cute hamster"]),
    _t("sunset", "Sunset", "nature", ["sunset", "hoang hon", "hoàng hôn", "sunrise", "binh minh", "bình minh"], [("hoàng hôn", "vi")], ["beautiful sunset sky", "golden hour sunset"]),
    _t("flowers", "Flowers", "nature", ["flowers", "hoa", "bouquet", "hoa dep"], [], ["beautiful flowers", "flower garden"]),
    _t("snow", "Snow", "nature", ["snow", "tuyet", "tuyết", "snowfall"], [("tuyết", "vi")], ["snowy landscape", "falling snow"]),
)

# --- Work / study niche ---
add(
    _t("study_with_me", "Study With Me", "education", ["study with me", "studywithme", "pomodoro study"], [], ["study with me desk", "student studying"]),
    _t("exam", "Exam", "education", ["exam", "thi cu", "kỳ thi", "ky thi", "on thi", "ôn thi"], [("ôn thi", "vi")], ["students taking exam", "exam preparation"]),
    _t("math", "Math", "education", ["math", "toan", "toán", "algebra", "geometry"], [("toán", "vi")], ["math equations on board"]),
    _t("english", "English", "language", ["learn english", "english tips", "tieng anh", "tiếng anh"], [("tiếng anh", "vi")], ["english learning", "english vocabulary"]),
    _t("japanese", "Japanese", "language", ["learn japanese", "tieng nhat", "tiếng nhật", "nihongo", "jlpt"], [("tiếng nhật", "vi")], ["japanese language study"]),
    _t("korean", "Korean", "language", ["learn korean", "tieng han", "tiếng hàn", "hangul"], [("tiếng hàn", "vi")], ["korean language study"]),
    _t("university", "University", "education", ["university", "campus", "dai hoc", "đại học", "sinh vien", "sinh viên"], [("đại học", "vi")], ["university campus", "college students"]),
    _t("remote_work", "Remote Work", "career", ["remote work", "work from home", "wfh", "digital nomad"], [], ["remote work laptop", "work from home desk"]),
    _t("side_hustle", "Side Hustle", "career", ["side hustle", "kiem tien online", "kiếm tiền online", "passive income"], [("kiếm tiền", "vi")], ["side hustle entrepreneurship"]),
)

# --- Sports extras ---
add(
    _t("running", "Running", "sports", ["running", "chay bo", "chạy bộ", "marathon", "jogging"], [("chạy bộ", "vi")], ["person running outdoors"]),
    _t("cycling", "Cycling", "sports", ["cycling", "dap xe", "đạp xe", "bike ride"], [("đạp xe", "vi")], ["person cycling", "road bike"]),
    _t("swimming", "Swimming", "sports", ["swimming", "boi loi", "bơi lội", "pool swim"], [("bơi", "vi")], ["person swimming pool"]),
    _t("badminton", "Badminton", "sports", ["badminton", "cau long", "cầu lông"], [("cầu lông", "vi")], ["badminton match"]),
    _t("volleyball", "Volleyball", "sports", ["volleyball", "bong chuyen", "bóng chuyền"], [("bóng chuyền", "vi")], ["volleyball game"]),
    _t("esports_tournament", "Esports Tournament", "gaming", ["esports tournament", "giai dau game", "giải đấu game"], [], ["esports arena tournament"]),
)

# --- Emotions / content formats ---
add(
    _t("happy", "Happy", "lifestyle", ["happy", "vui ve", "vui vẻ", "joyful", "smile"], [("vui vẻ", "vi")], ["happy smiling people"]),
    _t("relax", "Relax", "lifestyle", ["relax", "thu gian", "thư giãn", "calm", "peaceful"], [("thư giãn", "vi")], ["relaxing calm scene"]),
    _t("motovlog", "Motovlog", "automotive", ["motovlog", "moto vlog", "ride vlog"], [], ["motorcycle vlog riding"]),
    _t("car_vlog", "Car Vlog", "automotive", ["car vlog", "dashboard cam", "drive with me"], [], ["car driving vlog"]),
    _t("transformation", "Transformation", "fitness", ["transformation", "before after", "glow up", "weight loss journey"], [], ["fitness transformation before after"]),
    _t("outfit_ideas", "Outfit Ideas", "fashion", ["outfit ideas", "what i wore", "style tips"], [], ["fashion outfit ideas"]),
    _t("streetwear", "Streetwear", "fashion", ["streetwear", "sneakers", "sneakerhead"], [], ["streetwear fashion sneakers"]),
    _t("luxury", "Luxury", "fashion", ["luxury", "high fashion", "designer brand"], [], ["luxury fashion brand"]),
    _t("minimalism", "Minimalism", "lifestyle", ["minimalism", "minimalist", "declutter"], [], ["minimalist lifestyle room"]),
)

# Expand more short-video niches
add(
    _t("horror_game", "Horror Game", "gaming", ["horror game", "scary game", "resident evil", "outlast"], [], ["horror video game", "scary game gameplay"]),
    _t("gacha", "Gacha", "gaming", ["gacha", "wish genshin", "pull banner"], [], ["gacha game pull animation"]),
    _t("anime_edit", "Anime Edit", "anime", ["anime edit", "amv", "anime amv", "anime clip"], [], ["anime edit video", "anime amv"]),
    _t("manga_review", "Manga Review", "anime", ["manga review", "spoiler manga"], [], ["manga pages review"]),
    _t("kdrama", "K-Drama", "movies", ["kdrama", "k-drama", "korean drama", "phim han"], [], ["korean drama scene"]),
    _t("cdrama", "C-Drama", "movies", ["cdrama", "c-drama", "chinese drama", "phim trung"], [], ["chinese drama scene"]),
    _t("tvshow", "TV Show", "movies", ["tv show", "series", "season finale", "binge watch"], [], ["tv series scene"]),
    _t("stand_up", "Stand-up", "comedy", ["standup comedy", "stand-up", "comedy club"], [], ["standup comedian on stage"]),
    _t("sketch", "Sketch Comedy", "comedy", ["sketch comedy", "hài sketch", "comedy sketch"], [], ["comedy sketch performance"]),
    _t("dub", "Dub / Voiceover", "comedy", ["dubbing", "voiceover", "long tieng", "lồng tiếng"], [("lồng tiếng", "vi")], ["voiceover dubbing"]),
    _t("animation", "Animation", "art", ["animation", "2d animation", "3d animation", "hoat hinh", "hoạt hình"], [("hoạt hình", "vi")], ["animated cartoon", "3d animation"]),
    _t("digital_art", "Digital Art", "art", ["digital art", "procreate", "illustration", "drawing process"], [], ["digital art illustration"]),
    _t("calligraphy", "Calligraphy", "art", ["calligraphy", "thu phap", "thư pháp", "lettering"], [("thư pháp", "vi")], ["calligraphy writing"]),
    _t("nail_art", "Nail Art", "beauty", ["nail art", "nails", "manicure"], [], ["nail art design"]),
    _t("hair", "Hair", "beauty", ["hair", "hairstyle", "toc dep", "tóc đẹp", "hair transform"], [("tóc", "vi")], ["hairstyle transformation"]),
    _t("perfume", "Perfume", "beauty", ["perfume", "fragrance", "nuoc hoa", "nước hoa"], [("nước hoa", "vi")], ["perfume bottle fragrance"]),
    _t("jewelry", "Jewelry", "fashion", ["jewelry", "trang suc", "trang sức", "necklace", "ring"], [("trang sức", "vi")], ["jewelry accessories"]),
    _t("watches", "Watches", "fashion", ["watches", "dong ho", "đồng hồ", "watch collection"], [("đồng hồ", "vi")], ["luxury watch closeup"]),
    _t("parenting", "Parenting", "family", ["parenting", "nuoi con", "nuôi con", "me bau", "mẹ bầu", "tips me"], [("nuôi con", "vi")], ["parenting with baby"]),
    _t("wedding_dress", "Wedding Dress", "wedding", ["wedding dress", "vay cuoi", "váy cưới", "bridal"], [("váy cưới", "vi")], ["bridal wedding dress"]),
    _t("home_cook", "Home Cook", "food", ["home cook", "nau an o nha", "nấu ăn ở nhà", "bua com nha"], [], ["home cooked meal"]),
    _t("street_interview", "Street Interview", "viral", ["street interview", "phong van duong pho", "man on the street"], [], ["street interview microphone"]),
    _t("behind_the_scenes", "Behind The Scenes", "movies", ["behind the scenes", "bts filming", "hau truong", "hậu trường"], [("hậu trường", "vi")], ["behind the scenes filming"]),
    _t("trailer", "Trailer", "movies", ["trailer", "teaser", "official trailer"], [], ["movie trailer screens"]),
    _t("shortfilm", "Short Film", "movies", ["short film", "phim ngan", "phim ngắn"], [("phim ngắn", "vi")], ["cinematic short film"]),
)

# --- Extra wave: creator platforms, hobbies, jobs, more niches ---
add(
    _t("creator_tips", "Creator Tips", "viral", ["creator tips", "growth hack", "algorithm tips", "short video tips"], [], ["social media creator tips"]),
    _t("youtube", "YouTube", "career", ["youtube", "youtuber", "youtube shorts"], [], ["youtuber recording", "youtube studio"]),
    _t("content_creator", "Content Creator", "career", ["content creator", "creator economy", "kol", "influencer"], [], ["content creator filming"]),
    _t("photography_tips", "Photography Tips", "photography", ["photography tips", "camera tips", "composition"], [], ["photography tips tutorial"]),
    _t("drone", "Drone", "photography", ["drone", "fpv", "aerial video", "flycam"], [], ["drone aerial footage"]),
    _t("cinematography", "Cinematography", "movies", ["cinematography", "cinematic", "color grade"], [], ["cinematic camera shot"]),
    _t("editing", "Video Editing", "technology", ["video editing", "premiere", "capcut", "davinci", "chinh sua video"], [], ["video editing timeline"]),
    _t("after_effects", "Motion Design", "art", ["after effects", "motion graphics", "ae edit"], [], ["motion graphics animation"]),
    _t("thumbnails", "Thumbnails", "career", ["thumbnail", "yt thumbnail"], [], ["youtube thumbnail design"]),
    _t("podcast_clips", "Podcast Clips", "podcast", ["podcast clip", "shorts from podcast"], [], ["podcast clip talking heads"]),
    _t("book_summary", "Book Summary", "books", ["book summary", "tom tat sach", "tóm tắt sách"], [("tóm tắt sách", "vi")], ["book summary notes"]),
    _t("philosophy", "Philosophy", "education", ["philosophy", "triet hoc", "triết học"], [("triết học", "vi")], ["philosophy discussion"]),
    _t("psychology", "Psychology", "education", ["psychology", "tam ly", "tâm lý học", "mental tips"], [("tâm lý", "vi")], ["psychology concepts"]),
    _t("mental_health", "Mental Health", "health", ["mental health", "suc khoe tinh than", "sức khỏe tinh thần", "anxiety", "depression tips"], [("tinh thần", "vi")], ["mental health wellness"]),
    _t("sleep", "Sleep", "health", ["sleep tips", "giac ngu", "giấc ngủ", "insomnia", "ngu ngon"], [("giấc ngủ", "vi")], ["sleep tips bedroom"]),
    _t("weight_loss", "Weight Loss", "fitness", ["weight loss", "giam can", "giảm cân", "fat loss"], [("giảm cân", "vi")], ["weight loss journey"]),
    _t("bodybuilding", "Bodybuilding", "fitness", ["bodybuilding", "muscle gain", "hypertrophy"], [], ["bodybuilding gym muscles"]),
    _t("calisthenics", "Calisthenics", "fitness", ["calisthenics", "street workout", "pull up"], [], ["calisthenics street workout"]),
    _t("crossfit", "CrossFit", "fitness", ["crossfit", "hiit", "functional training"], [], ["crossfit workout"]),
    _t("boxing_training", "Boxing Training", "sports", ["boxing training", "shadow boxing", "đấm bốc"], [], ["boxing training gym"]),
    _t("football_skills", "Football Skills", "sports", ["football skills", "soccer freestyle", "ky thuat bong da"], [], ["soccer freestyle skills"]),
    _t("f1", "Formula 1", "sports", ["formula 1", "f1", "grand prix"], [], ["formula 1 race car"]),
    _t("esports_valorant", "Valorant Esports", "gaming", ["valorant champions", "vct"], [], ["valorant esports stage"]),
    _t("chess", "Chess", "education", ["chess", "co vua", "cờ vua", "checkmate"], [("cờ vua", "vi")], ["chess board game"]),
    _t("boardgames", "Board Games", "lifestyle", ["board game", "boardgame", "tro choi ban"], [], ["board game night"]),
    _t("collectibles", "Collectibles", "lifestyle", ["collectibles", "figure", "pop mart", "blind box", "mo mo"], [], ["collectible figures"]),
    _t("lego", "LEGO", "diy", ["lego", "lego build"], [], ["lego building bricks"]),
    _t("origami", "Origami", "diy", ["origami", "gap giay", "gấp giấy"], [("gấp giấy", "vi")], ["origami paper folding"]),
    _t("sewing", "Sewing", "diy", ["sewing", "may va", "may vá", "diy clothes"], [("may vá", "vi")], ["sewing machine clothes"]),
    _t("knitting", "Knitting", "diy", ["knitting", "crochet", "moc"], [], ["knitting yarn crochet"]),
    _t("pottery", "Pottery", "art", ["pottery", "gom", "ceramic"], [], ["pottery wheel ceramics"]),
    _t("tattoo", "Tattoo", "art", ["tattoo", "xam", "xăm", "ink tattoo"], [("xăm", "vi")], ["tattoo artist inking"]),
    _t("piercing", "Piercing", "beauty", ["piercing", "ear piercing"], [], ["ear piercing jewelry"]),
    _t("barber", "Barber", "beauty", ["barber", "fade haircut", "cat toc nam", "cắt tóc nam"], [], ["barber haircut fade"]),
    _t("salon", "Salon", "beauty", ["salon", "lam toc", "làm tóc", "hair salon"], [("làm tóc", "vi")], ["hair salon styling"]),
    _t("spa", "Spa", "health", ["spa", "massage", "facial spa"], [], ["spa massage relaxation"]),
    _t("dental", "Dental", "health", ["dental", "nha khoa", "braces", "rang"], [], ["dental clinic care"]),
    _t("medical", "Medical", "health", ["medical", "bac si", "bác sĩ", "hospital tips"], [("bác sĩ", "vi")], ["medical doctor advice"]),
    _t("first_aid", "First Aid", "health", ["first aid", "so cuu", "sơ cứu"], [("sơ cứu", "vi")], ["first aid emergency"]),
    _t("pregnancy", "Pregnancy", "family", ["pregnancy", "bau", "bầu", "mang thai", "prenatal"], [("mang thai", "vi")], ["pregnancy maternity"]),
    _t("newborn", "Newborn", "kids", ["newborn", "so sinh", "sơ sinh", "baby care"], [("sơ sinh", "vi")], ["newborn baby care"]),
    _t("toys", "Toys", "kids", ["toys", "do choi", "đồ chơi", "lego kids"], [("đồ chơi", "vi")], ["kids toys"]),
    _t("cartoon", "Cartoon", "kids", ["cartoon", "hoat hinh tre em", "kids cartoon"], [], ["kids cartoon animation"]),
    _t("disney", "Disney", "movies", ["disney", "pixar", "disney plus"], [], ["disney animation"]),
    _t("marvel", "Marvel", "movies", ["marvel", "avengers", "mcu", "spiderman"], [], ["marvel superhero scene"]),
    _t("dc_comics", "DC", "movies", ["dc comics", "batman", "superman", "joker"], [], ["dc superhero batman"]),
    _t("star_wars", "Star Wars", "scifi", ["star wars", "jedi", "lightsaber"], [], ["star wars scene"]),
    _t("harry_potter", "Harry Potter", "movies", ["harry potter", "hogwarts", "wizarding"], [], ["harry potter magical"]),
    _t("fantasy", "Fantasy", "movies", ["fantasy", "magic world", "kiem hiep", "kiếm hiệp"], [("kiếm hiệp", "vi")], ["fantasy adventure world"]),
    _t("mythology", "Mythology", "history", ["mythology", "than thoai", "thần thoại", "greek myth"], [("thần thoại", "vi")], ["mythology gods story"]),
    _t("war_history", "War History", "history", ["war history", "chien tranh", "chiến tranh", "ww2"], [("chiến tranh", "vi")], ["war history documentary"]),
    _t("archaeology", "Archaeology", "history", ["archaeology", "khao co", "khảo cổ"], [("khảo cổ", "vi")], ["archaeology excavation"]),
    _t("space", "Space", "science", ["space", "nasa", "astronomy", "vu tru", "vũ trụ", "galaxy"], [("vũ trụ", "vi")], ["outer space galaxy"]),
    _t("physics", "Physics", "science", ["physics", "vat ly", "vật lý"], [("vật lý", "vi")], ["physics experiment"]),
    _t("chemistry", "Chemistry", "science", ["chemistry", "hoa hoc", "hóa học"], [("hóa học", "vi")], ["chemistry lab experiment"]),
    _t("biology", "Biology", "science", ["biology", "sinh hoc", "sinh học"], [("sinh học", "vi")], ["biology science"]),
    _t("environment", "Environment", "nature", ["environment", "moi truong", "môi trường", "climate", "recycle"], [("môi trường", "vi")], ["environment nature climate"]),
    _t("wildlife", "Wildlife", "nature", ["wildlife", "dong vat hoang da", "safari", "wild animals"], [], ["wildlife animals nature"]),
    _t("ocean", "Ocean", "nature", ["ocean", "bien sau", "underwater", "coral reef"], [], ["underwater ocean reef"]),
    _t("hiking", "Hiking", "travel", ["hiking", "trekking", "leo nui", "leo núi"], [("leo núi", "vi")], ["hiking mountain trail"]),
    _t("backpacking", "Backpacking", "travel", ["backpacking", "phuot", "phượt", "budget travel"], [("phượt", "vi")], ["backpacking travel"]),
    _t("luxury_travel", "Luxury Travel", "travel", ["luxury travel", "resort", "5 star hotel"], [], ["luxury resort travel"]),
    _t("hotel", "Hotel", "travel", ["hotel", "khach san", "khách sạn", "hotel tour"], [("khách sạn", "vi")], ["hotel room tour"]),
    _t("airport", "Airport", "travel", ["airport", "san bay", "sân bay", "flight"], [("sân bay", "vi")], ["airport travel"]),
    _t("train_travel", "Train Travel", "travel", ["train travel", "tau hoa", "tàu hỏa"], [("tàu hỏa", "vi")], ["train journey travel"]),
    _t("street_photography", "Street Photography", "photography", ["street photography", "streetphoto"], [], ["street photography candid"]),
    _t("portrait", "Portrait", "photography", ["portrait", "chan dung", "chân dung", "portrait photography"], [("chân dung", "vi")], ["portrait photography"]),
    _t("wedding_photo", "Wedding Photography", "wedding", ["wedding photography", "chup cuoi", "chụp cưới"], [("chụp cưới", "vi")], ["wedding photography couple"]),
    _t("real_estate_tour", "Property Tour", "realestate", ["house tour", "apartment tour", "nha dep", "căn hộ đẹp"], [], ["house tour interior"]),
    _t("investing", "Investing", "finance", ["investing", "dau tu", "đầu tư", "portfolio"], [("đầu tư", "vi")], ["investing finance charts"]),
    _t("stock_market", "Stock Market", "finance", ["stock market", "chung khoan", "chứng khoán", "trading"], [("chứng khoán", "vi")], ["stock market trading"]),
    _t("saving_money", "Saving Money", "finance", ["saving money", "tiet kiem", "tiết kiệm", "frugal"], [("tiết kiệm", "vi")], ["saving money tips"]),
    _t("tax", "Tax", "finance", ["tax tips", "thue", "thuế", "personal finance tax"], [("thuế", "vi")], ["tax finance documents"]),
    _t("startup", "Startup", "career", ["startup", "founder", "entrepreneur", "khoi nghiep", "khởi nghiệp"], [("khởi nghiệp", "vi")], ["startup entrepreneurs"]),
    _t("marketing", "Marketing", "career", ["marketing", "digital marketing", "ads", "seo"], [], ["digital marketing ads"]),
    _t("sales", "Sales", "career", ["sales tips", "ban hang", "bán hàng", "closing deal"], [("bán hàng", "vi")], ["sales business meeting"]),
    _t("customer_service", "Customer Service", "career", ["customer service", "cham soc khach", "cs khach hang"], [], ["customer service support"]),
    _t("office_life", "Office Life", "career", ["office life", "van phong", "cuộc sống văn phòng", "9to5"], [], ["office workplace life"]),
    _t("freelancer", "Freelancer", "career", ["freelancer", "freelance", "upwork", "fiverr"], [], ["freelancer working laptop"]),
    _t("teacher", "Teacher", "education", ["teacher", "giao vien", "giáo viên", "teaching tips"], [("giáo viên", "vi")], ["teacher in classroom"]),
    _t("student_life", "Student Life", "education", ["student life", "doi sinh vien", "đời sinh viên", "campus life"], [("sinh viên", "vi")], ["student campus life"]),
    _t("scholarship", "Scholarship", "education", ["scholarship", "hoc bong", "học bổng"], [("học bổng", "vi")], ["scholarship education"]),
)

# --- Food / VN cuisine deeper ---
add(
    _t("pho", "Pho", "food", ["pho", "phở", "pho bo", "phở bò"], [("phở", "vi")], ["vietnamese pho bowl"]),
    _t("banh_mi", "Banh Mi", "food", ["banh mi", "bánh mì"], [("bánh mì", "vi")], ["vietnamese banh mi"]),
    _t("bun_bo", "Bun Bo", "food", ["bun bo", "bún bò", "bun bo hue"], [("bún bò", "vi")], ["bun bo hue bowl"]),
    _t("com_tam", "Com Tam", "food", ["com tam", "cơm tấm"], [("cơm tấm", "vi")], ["com tam broken rice"]),
    _t("bun_cha", "Bun Cha", "food", ["bun cha", "bún chả"], [("bún chả", "vi")], ["bun cha hanoi"]),
    _t("banh_xeo", "Banh Xeo", "food", ["banh xeo", "bánh xèo"], [("bánh xèo", "vi")], ["vietnamese banh xeo"]),
    _t("goi_cuon", "Goi Cuon", "food", ["goi cuon", "gỏi cuốn", "spring rolls"], [("gỏi cuốn", "vi")], ["fresh spring rolls"]),
    _t("banh_chung", "Banh Chung", "food", ["banh chung", "bánh chưng", "banh tet"], [("bánh chưng", "vi")], ["banh chung tet food"]),
    _t("che", "Che Dessert", "food", ["che ba mau", "chè", "che thai"], [("chè", "vi")], ["vietnamese che dessert"]),
    _t("hu_tieu", "Hu Tieu", "food", ["hu tieu", "hủ tiếu"], [("hủ tiếu", "vi")], ["hu tieu noodle soup"]),
    _t("mi_quang", "Mi Quang", "food", ["mi quang", "mì quảng"], [("mì quảng", "vi")], ["mi quang noodles"]),
    _t("cao_lau", "Cao Lau", "food", ["cao lau", "cao lầu"], [("cao lầu", "vi")], ["cao lau hoi an"]),
    _t("oc", "Oc Seafood", "food", ["oc", "ốc", "an oc", "ốc hút"], [("ốc", "vi")], ["vietnamese snails oc"]),
    _t("bun_dau", "Bun Dau", "food", ["bun dau", "bún đậu", "bun dau mam tom"], [("bún đậu", "vi")], ["bun dau mam tom"]),
    _t("dimsum", "Dim Sum", "food", ["dimsum", "dim sum", "ha cao", "há cảo"], [], ["dim sum dumplings"]),
    _t("ramen", "Ramen", "food", ["ramen", "tonkotsu"], [], ["japanese ramen bowl"]),
    _t("sushi", "Sushi", "food", ["sushi", "sashimi", "nigiri"], [], ["sushi platter"]),
    _t("pizza", "Pizza", "food", ["pizza", "pepperoni pizza"], [], ["pizza slice"]),
    _t("burger", "Burger", "food", ["burger", "hamburger", "cheeseburger"], [], ["hamburger burger"]),
    _t("fried_chicken", "Fried Chicken", "food", ["fried chicken", "ga ran", "gà rán", "kfc style"], [("gà rán", "vi")], ["fried chicken"]),
    _t("bbq_korea", "Korean BBQ", "food", ["korean bbq", "bbq han", "thit nuong han"], [], ["korean bbq grill"]),
    _t("hotpot_china", "Chinese Hotpot", "food", ["chinese hotpot", "malatang", "haidilao"], [], ["chinese hotpot"]),
    _t("icecream", "Ice Cream", "food", ["ice cream", "kem", "gelato", "sundae"], [("kem", "vi")], ["ice cream dessert"]),
    _t("chocolate", "Chocolate", "food", ["chocolate", "socola", "cacao"], [], ["chocolate dessert"]),
    _t("tea", "Tea", "food", ["tea", "tra", "trà", "matcha", "tra xanh"], [("trà", "vi")], ["tea ceremony cup"]),
    _t("matcha", "Matcha", "food", ["matcha", "matcha latte"], [], ["matcha green tea latte"]),
    _t("smoothie", "Smoothie", "food", ["smoothie", "juice", "nuoc ep", "nước ép"], [("nước ép", "vi")], ["fruit smoothie"]),
)

# --- Games / anime deeper ---
add(
    _t("one_piece", "One Piece", "anime", ["one piece", "luffy", "zoro", "onepiece"], [], ["one piece anime"]),
    _t("naruto", "Naruto", "anime", ["naruto", "sasuke", "boruto"], [], ["naruto anime ninja"]),
    _t("demon_slayer", "Demon Slayer", "anime", ["demon slayer", "kimetsu", "tanjiro"], [], ["demon slayer anime"]),
    _t("jujutsu_kaisen", "Jujutsu Kaisen", "anime", ["jujutsu kaisen", "jjk", "gojo"], [], ["jujutsu kaisen anime"]),
    _t("aot", "Attack on Titan", "anime", ["attack on titan", "aot", "shingeki"], [], ["attack on titan anime"]),
    _t("dragon_ball", "Dragon Ball", "anime", ["dragon ball", "goku", "dbz"], [], ["dragon ball anime"]),
    _t("pokemon", "Pokemon", "anime", ["pokemon", "pokémon", "pikachu"], [], ["pokemon anime"]),
    _t("studio_ghibli", "Studio Ghibli", "anime", ["ghibli", "totoro", "spirited away"], [], ["studio ghibli style"]),
    _t("honkai", "Honkai", "gaming", ["honkai", "honkai star rail", "hsr"], [], ["honkai star rail"]),
    _t("zenless", "Zenless Zone Zero", "gaming", ["zenless", "zzz game"], [], ["zenless zone zero"]),
    _t("lol_wild_rift", "Wild Rift", "gaming", ["wild rift", "lol mobile"], [], ["league wild rift"]),
    _t("cod_mobile", "COD Mobile", "gaming", ["cod mobile", "call of duty mobile"], [], ["cod mobile gameplay"]),
    _t("clash_royale", "Clash Royale", "gaming", ["clash royale", "clash of clans"], [], ["clash royale gameplay"]),
    _t("among_us", "Among Us", "gaming", ["among us", "imposter"], [], ["among us gameplay"]),
    _t("minecraft_build", "Minecraft Build", "gaming", ["minecraft build", "minecraft house", "redstone"], [], ["minecraft building"]),
)

# --- Music deeper ---
add(
    _t("indie_music", "Indie Music", "music", ["indie music", "indie song", "nhac indie"], [], ["indie music performance"]),
    _t("acoustic", "Acoustic", "music", ["acoustic", "acoustic cover", "dan guitar acoustic"], [], ["acoustic guitar singing"]),
    _t("rnb", "R&B", "music", ["r&b", "rnb", "soul music"], [], ["rnb soul performance"]),
    _t("usuk", "US-UK Pop", "music", ["usuk", "us-uk", "western pop", "billboard"], [], ["western pop music video"]),
    _t("latin", "Latin Music", "music", ["latin music", "reggaeton", "salsa"], [], ["latin music dance"]),
    _t("vietnamese_rap", "V-Rap", "music", ["vrap", "rap viet", "vietnamese rap"], [], ["vietnamese rap freestyle"]),
    _t("bolero", "Bolero", "music", ["bolero", "nhac bolero", "nhạc trữ tình"], [], ["bolero emotional singing"]),
    _t("cai_luong", "Cai Luong", "music", ["cai luong", "cải lương"], [("cải lương", "vi")], ["cai luong traditional"]),
    _t("cheo", "Cheo", "music", ["cheo", "chèo"], [("chèo", "vi")], ["cheo traditional theater"]),
)

# --- Cars / gadgets ---
add(
    _t("supercar", "Supercar", "automotive", ["supercar", "lamborghini", "ferrari", "mclaren"], [], ["supercar sports car"]),
    _t("jdm", "JDM", "automotive", ["jdm", "toyota supra", "nissan gtr", "honda civic type r"], [], ["jdm car modification"]),
    _t("car_mod", "Car Mod", "automotive", ["car mod", "car modification", "stance", "wrap"], [], ["modified car wrap"]),
    _t("ev_review", "EV Review", "automotive", ["ev review", "vinfast review", "tesla review"], [], ["electric vehicle review"]),
    _t("gadget", "Gadget", "technology", ["gadget", "tech gadget", "must have gadget"], [], ["tech gadgets desk"]),
    _t("camera_gear", "Camera Gear", "photography", ["camera gear", "sony a7", "canon r", "gopro"], [], ["camera gear photography"]),
    _t("headphones", "Headphones", "technology", ["headphones", "earbuds", "airpods", "tai nghe"], [("tai nghe", "vi")], ["headphones earbuds"]),
    _t("smart_home", "Smart Home", "technology", ["smart home", "iot", "alexa", "nha thong minh"], [], ["smart home devices"]),
)

# --- Content moderation visual (CLIP zero-shot; category=None — not Explore discovery) ---
add(
    _t(
        "nsfw",
        "NSFW",
        None,
        ["nsfw", "adult only", "18+", "not safe for work"],
        [],
        [
            "explicit nudity pornographic adult content",
            "nsfw sexual content in video",
            "adult explicit material not safe for work",
        ],
    ),
    _t(
        "explicit",
        "Explicit Content",
        None,
        ["explicit", "explicit content", "18 plus", "mature explicit"],
        [],
        [
            "explicit sexual content in video",
            "explicit nudity scene",
            "adult explicit sexual act",
        ],
    ),
    _t(
        "porn",
        "Pornography",
        None,
        ["porn", "pornography", "xxx video", "hardcore"],
        [],
        [
            "pornographic video scene",
            "hardcore pornography",
            "adult porn video",
        ],
    ),
    _t(
        "adult_content",
        "Adult Content",
        None,
        ["adult content", "adult video", "mature content", "adults only"],
        [],
        [
            "adult only mature sexual content",
            "restricted adult video",
            "mature audience sexual content",
        ],
    ),
    _t(
        "adult",
        "Adult",
        None,
        ["adult", "adult material", "adult scene"],
        [],
        ["adult sexual content", "adult only video", "mature adult scene"],
    ),
    _t(
        "nudity",
        "Nudity",
        None,
        ["nudity", "nude", "naked", "topless", "no clothes"],
        [],
        [
            "full frontal nudity",
            "naked person without clothes",
            "topless nude body",
        ],
    ),
    _t(
        "lingerie",
        "Lingerie",
        None,
        ["lingerie", "underwear model", "sexy lingerie"],
        [],
        ["person in lingerie underwear", "sexy lingerie photoshoot", "revealing lingerie"],
    ),
    _t(
        "seductive",
        "Seductive",
        None,
        ["seductive", "provocative pose", "sensual"],
        [],
        ["seductive provocative pose", "sensual adult pose", "provocative sexual pose"],
    ),
    _t(
        "kissing",
        "Kissing",
        None,
        ["kissing", "make out", "passionate kiss"],
        [],
        ["passionate kissing couple", "people kissing intimately", "romantic kiss closeup"],
    ),
    _t(
        "violence",
        "Violence",
        None,
        ["violence", "violent", "graphic violence", "assault"],
        [],
        [
            "graphic violence assault",
            "violent fight beating",
            "people fighting violently",
        ],
    ),
    _t(
        "gore",
        "Gore",
        None,
        ["gore", "bloodbath", "graphic gore", "disturbing gore"],
        [],
        [
            "graphic gore blood injury",
            "bloody gore violent injury",
            "disturbing gore scene",
        ],
    ),
    _t(
        "weapon",
        "Weapon",
        None,
        ["weapon", "armed", "weapon threat", "deadly weapon"],
        [],
        [
            "person holding weapon threatening",
            "knife or gun weapon violence",
            "armed person with weapon",
        ],
    ),
    _t(
        "guns",
        "Guns",
        None,
        ["guns", "gun", "firearm", "shooting", "pistol", "rifle"],
        [],
        [
            "person holding gun firearm",
            "gun shooting violence",
            "firearm pointed at camera",
        ],
    ),
    _t(
        "blood",
        "Blood",
        None,
        ["blood", "bloody", "bleeding", "blood injury"],
        [],
        [
            "blood injury wound",
            "bloody violent scene",
            "bleeding graphic wound",
        ],
    ),
)

# Deduplicate by slug (first wins)
_seen: set[str] = set()
UNIQUE_TAGS: list[dict] = []
for row in TAGS:
    if row["slug"] in _seen:
        continue
    _seen.add(row["slug"])
    UNIQUE_TAGS.append(row)


def _py_str_tuple(values: list[str]) -> str:
    return "(" + ", ".join(json.dumps(v, ensure_ascii=False) for v in values) + ")"


def write_vocab_catalog() -> None:
    lines = [
        '"""Auto-generated CU vocabulary catalog. Do not edit by hand — run scripts/build_vocab.py."""',
        "",
        "from __future__ import annotations",
        "",
        "from typing import Any",
        "",
        "TAG_ROWS: list[dict[str, Any]] = [",
    ]
    for row in UNIQUE_TAGS:
        lines.append("    {")
        lines.append(f'        "slug": {json.dumps(row["slug"])},')
        lines.append(f'        "name": {json.dumps(row["name"], ensure_ascii=False)},')
        # json.dumps(None) → null (invalid Python); emit None literal instead.
        cat = row["category"]
        lines.append(
            '        "category": None,'
            if cat is None
            else f'        "category": {json.dumps(cat)},'
        )
        lines.append(f'        "keywords": {_py_str_tuple(row["keywords"])},')
        alias_tuples = ", ".join(
            f'({json.dumps(a)}, {json.dumps(lang)})' for a, lang in row["aliases"]
        )
        lines.append(f'        "aliases": ({alias_tuples},),' if row["aliases"] else '        "aliases": (),')
        lines.append(f'        "clip": {_py_str_tuple(row["clip"])},')
        lines.append("    },")
    lines.append("]")
    lines.append("")
    lines.append("LEXICON: dict[str, tuple[str, ...]] = {row['slug']: tuple(row['keywords']) for row in TAG_ROWS}")
    lines.append("CLIP_TAG_PROMPTS: dict[str, tuple[str, ...]] = {row['slug']: tuple(row['clip']) for row in TAG_ROWS}")
    lines.append("TAG_NAMES: dict[str, str] = {row['slug']: row['name'] for row in TAG_ROWS}")
    lines.append("")
    lines.append(f"# count={len(UNIQUE_TAGS)}")
    lines.append("")
    out = WORKER_APP / "vocab_catalog.py"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(UNIQUE_TAGS)} tags)")


def _sql_escape(s: str) -> str:
    return s.replace("'", "''")


def write_migration() -> None:
    tag_values = []
    for row in UNIQUE_TAGS:
        tag_values.append(
            f"    ('{_sql_escape(row['slug'])}', '{_sql_escape(row['name'])}', 'und', 'active')"
        )

    alias_values = []
    claimed_aliases: set[tuple[str, str]] = set()
    for row in UNIQUE_TAGS:
        for alias, lang in row["aliases"]:
            key = (alias.strip().lower(), lang)
            if not alias.strip() or key in claimed_aliases:
                continue
            claimed_aliases.add(key)
            alias_values.append(
                f"    ('{_sql_escape(row['slug'])}', '{_sql_escape(alias)}', '{_sql_escape(lang)}')"
            )
        # Also register primary keywords that differ from slug as aliases (en/vi heuristic)
        for kw in row["keywords"]:
            key_alias = kw.strip().lower()
            if not key_alias or key_alias == row["slug"] or len(key_alias) < 3:
                continue
            lang = "vi" if any(ord(ch) > 127 for ch in kw) else "en"
            key = (key_alias, lang)
            if key in claimed_aliases:
                continue
            if any(a[0].lower() == key_alias for a in row["aliases"]):
                # already emitted from explicit aliases
                pass
            claimed_aliases.add(key)
            alias_values.append(
                f"    ('{_sql_escape(row['slug'])}', '{_sql_escape(key_alias)}', '{lang}')"
            )

    # de-dupe alias value lines (safety)
    alias_values = list(dict.fromkeys(alias_values))

    map_values = []
    for row in UNIQUE_TAGS:
        cat = row["category"]
        if not cat:
            continue
        weight = 1.0 if cat.replace("_", "") in row["slug"].replace("_", "") or cat == row["slug"] else 0.85
        map_values.append(
            f"    ('{_sql_escape(cat)}', '{_sql_escape(row['slug'])}', {weight}, 50)"
        )

    sql = f"""-- CU vocabulary expansion (closed lexicon, large seed)
-- Generated by ai-workers/content-understanding/scripts/build_vocab.py
-- Tags: {len(UNIQUE_TAGS)}

INSERT INTO semantic_tags (slug, name, language, status) VALUES
{",\n".join(tag_values)}
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    status = 'active',
    updated_at = NOW();

INSERT INTO semantic_tag_aliases (tag_id, alias, language)
SELECT t.id, v.alias, v.lang
FROM (VALUES
{",\n".join(alias_values)}
) AS v(slug, alias, lang)
JOIN semantic_tags t ON t.slug = v.slug
ON CONFLICT (alias, language) DO NOTHING;

INSERT INTO category_tag_mapping (category_id, tag_id, weight, priority)
SELECT c.id, t.id, v.weight, v.priority
FROM (VALUES
{",\n".join(map_values)}
) AS v(cat_slug, tag_slug, weight, priority)
JOIN categories c ON c.slug = v.cat_slug
JOIN semantic_tags t ON t.slug = v.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE
SET weight = EXCLUDED.weight;
"""
    MIGRATION.write_text(sql, encoding="utf-8")
    print(f"Wrote {MIGRATION}")
    print(f"  tags={len(UNIQUE_TAGS)} aliases={len(alias_values)} mappings={len(map_values)}")


def main() -> None:
    write_vocab_catalog()
    write_migration()


if __name__ == "__main__":
    main()
