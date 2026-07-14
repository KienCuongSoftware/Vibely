package com.vibely.backend.explore.service;

import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class CategoryClassifierService {
    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#([\\p{L}\\p{N}_]{2,80})");
    private static final double MIN_CATEGORY_SCORE = 1.0;
    private static final double STRONG_CATEGORY_SCORE = 2.0;
    public static final String ALL_CATEGORY_SLUG = "all";

    private static final Map<String, Set<String>> KEYWORDS;
    private static final Map<String, String> HASHTAG_CATEGORY_ALIASES;

    static {
        Map<String, Set<String>> keywords = new LinkedHashMap<>();
        keywords.put("music", Set.of(
            "music", "song", "amnhac", "am nhac", "nhac", "remix", "cover",
            "lyrics", "lyric", "karaoke", "sing", "audio", "am thanh",
            "sound", "soundtrack", "melody", "lofi", "ballad", "rap", "hiphop", "edm"
        ));
        keywords.put("dance", Set.of(
            "dance", "nhay", "nhảy", "choreography", "tiktok dance", "nhay dep", "nhảy đẹp"
        ));
        keywords.put("food", Set.of("food", "monan", "anuong", "recipe", "nauan", "nau an"));
        keywords.put("travel", Set.of("travel", "dulich", "trip", "review du lich"));
        keywords.put("gaming", Set.of("game", "gaming", "esports", "gameplay"));
        keywords.put("beauty", Set.of("beauty", "makeup", "lamdep", "skincare", "gai xinh"));
        keywords.put("fitness", Set.of("fitness", "gym", "workout"));
        keywords.put("comedy", Set.of("funny", "hai", "comedy", "hai huoc", "hài"));
        keywords.put("technology", Set.of(
            "technology", "congnghe", "cong nghe", "programming", "software",
            "developer", "coding", "chatgpt", "springboot", "artificial intelligence"
        ));
        keywords.put("horror", Set.of(
            "horror", "horror story", "horrorstory", "kinh di", "kinhdi", "truyen ma", "truyenma",
            "creepypasta", "creepy", "halloween", "ghost", "scary", "true crime", "phim ma",
            "ke chuyen ma", "am anh"
        ));
        keywords.put("romance", Set.of(
            "romance", "tinh cam", "tinhcam", "love story", "ngon tinh", "couple"
        ));
        keywords.put("action", Set.of("action", "hanh dong", "hanhdong", "fight", "combat"));
        keywords.put("thriller", Set.of("thriller", "giat gan", "suspense", "mystery"));
        keywords.put("scifi", Set.of("scifi", "sci fi", "khoa hoc vien tuong", "futuristic"));
        keywords.put("movies", Set.of("movie", "movies", "phim", "film", "cinema"));
        keywords.put("documentary", Set.of("documentary", "phim tai lieu", "tailieu"));
        keywords.put("meme", Set.of("meme", "shitpost", "mode"));
        keywords.put("prank", Set.of("prank", "tro dua", "trodua"));
        keywords.put("challenge", Set.of("challenge", "thu thach", "thuthach", "trend challenge"));
        keywords.put("reaction", Set.of("reaction", "react", "phan ung"));
        keywords.put("asmr", Set.of("asmr", "whisper", "tingles"));
        keywords.put("motivation", Set.of("motivation", "dong luc", "dongluc", "inspirational"));
        keywords.put("diy", Set.of("diy", "handmade", "thu cong", "craft"));
        keywords.put("nature", Set.of("nature", "thien nhien", "thiennhien", "forest", "mountain"));
        keywords.put("photography", Set.of("photography", "nhiep anh", "nhiepanh", "photo", "camera"));
        keywords.put("magic", Set.of("magic", "ao thuat", "aothuat", "illusion", "magician"));
        keywords.put("cosplay", Set.of("cosplay", "costume"));
        keywords.put("books", Set.of("books", "sach", "reading", "novel"));
        keywords.put("science", Set.of("science", "khoa hoc", "khoahoc", "experiment"));
        keywords.put("history", Set.of("history", "lich su", "lichsu"));
        keywords.put("language", Set.of("language", "ngoai ngu", "ngoaingu", "english", "tieng anh"));
        keywords.put("health", Set.of("health", "suc khoe", "suckhoe", "wellness", "y te"));
        keywords.put("kids", Set.of("kids", "tre em", "treem", "baby", "children"));
        keywords.put("wedding", Set.of("wedding", "dam cuoi", "damcuoi", "bride"));
        keywords.put("relationships", Set.of("relationships", "moi quan he", "dating", "hen ho"));
        keywords.put("career", Set.of("career", "su nghiep", "sunghiep", "job", "cv"));
        keywords.put("realestate", Set.of("realestate", "bat dong san", "batdongsan", "bds", "nha dat"));
        keywords.put("camping", Set.of("camping", "cam trai", "camtrai", "glamping"));
        keywords.put("fishing", Set.of("fishing", "cau ca", "cauca"));
        keywords.put("farming", Set.of("farming", "nong nghiep", "nongnghiep", "nong trai"));
        keywords.put("unboxing", Set.of("unboxing", "mo hop", "mohop"));
        keywords.put("review", Set.of("review", "danh gia", "danhgia"));
        keywords.put("podcast", Set.of("podcast", "talkshow"));
        keywords.put("instruments", Set.of("instrument", "nhac cu", "nhaccu", "guitar", "piano", "violin"));
        keywords.put("kpop", Set.of("kpop", "k-pop", "k pop", "bts", "blackpink"));
        keywords.put("vpop", Set.of("vpop", "v-pop", "v pop", "nhac viet"));
        keywords.put("mukbang", Set.of("mukbang", "an thung", "eating show"));
        keywords.put("streetfood", Set.of("streetfood", "am thuc duong pho", "street food"));
        keywords.put("spirituality", Set.of("spirituality", "tam linh", "tamlinh", "meditation"));
        keywords.put("viral", Set.of("viral", "xu huong", "xuhuong", "trending", "fyp"));
        keywords.put("anime", Set.of("anime", "manga", "otaku", "gfxanime"));
        keywords.put("pets", Set.of("pet", "pets", "dog", "cat", "cho", "meo", "thu cung"));
        keywords.put("sports", Set.of("sports", "the thao", "thethao", "football", "bong da"));
        keywords.put("fashion", Set.of("fashion", "thoi trang", "thoitrang", "outfit", "ootd"));
        keywords.put("news", Set.of("news", "tin tuc", "tintuc", "breaking"));
        keywords.put("education", Set.of("education", "giao duc", "giaoduc", "tutorial", "hoc"));
        keywords.put("family", Set.of("family", "gia dinh", "giadinh", "bo me"));
        keywords.put("lifestyle", Set.of("lifestyle", "daily vlog", "vlog"));
        keywords.put("art", Set.of("art", "nghe thuat", "nghethuat", "drawing", "painting"));
        keywords.put("finance", Set.of("finance", "tai chinh", "taichinh", "crypto", "stock", "dautu"));
        keywords.put("automotive", Set.of("automotive", "xe", "car", "moto", "oto", "xe co"));
        KEYWORDS = Map.copyOf(keywords);

        Map<String, String> aliases = new LinkedHashMap<>();
        aliases.put("lyrics", "music");
        aliases.put("lyric", "music");
        aliases.put("lyricvideo", "music");
        aliases.put("singing", "music");
        aliases.put("sing", "music");
        aliases.put("karaoke", "music");
        aliases.put("nhac", "music");
        aliases.put("amnhac", "music");
        aliases.put("remix", "music");
        aliases.put("cover", "music");
        aliases.put("audio", "music");
        aliases.put("sound", "music");
        aliases.put("beat", "music");
        aliases.put("edm", "music");
        aliases.put("hiphop", "music");
        aliases.put("choreography", "dance");
        aliases.put("dancing", "dance");
        aliases.put("nhay", "dance");
        aliases.put("monan", "food");
        aliases.put("anuong", "food");
        aliases.put("nauan", "food");
        aliases.put("dulich", "travel");
        aliases.put("lamdep", "beauty");
        aliases.put("makeup", "beauty");
        aliases.put("skincare", "beauty");
        aliases.put("congnghe", "technology");
        aliases.put("tech", "technology");
        aliases.put("coding", "technology");
        aliases.put("programming", "technology");
        aliases.put("chatgpt", "technology");
        aliases.put("ai", "technology");
        aliases.put("anime", "anime");
        aliases.put("manga", "anime");
        aliases.put("gfxanime", "anime");
        aliases.put("アニメ", "anime");
        aliases.put("アニメーション", "anime");
        aliases.put("kinhdi", "horror");
        aliases.put("kinh_di", "horror");
        aliases.put("horror", "horror");
        aliases.put("horrorstory", "horror");
        aliases.put("horror_story", "horror");
        aliases.put("truyenma", "horror");
        aliases.put("truyen_ma", "horror");
        aliases.put("creepypasta", "horror");
        aliases.put("creepy", "horror");
        aliases.put("scary", "horror");
        aliases.put("halloween", "horror");
        aliases.put("phimma", "horror");
        aliases.put("phim_ma", "horror");
        aliases.put("ghost", "horror");
        aliases.put("ghoststory", "horror");
        aliases.put("truecrime", "horror");
        aliases.put("kechuyenma", "horror");
        aliases.put("phimkinhdi", "horror");
        aliases.put("tinhcam", "romance");
        aliases.put("love", "romance");
        aliases.put("ngontinh", "romance");
        aliases.put("hanhdong", "action");
        aliases.put("action", "action");
        aliases.put("giatgan", "thriller");
        aliases.put("thriller", "thriller");
        aliases.put("scifi", "scifi");
        aliases.put("khoahocvientuong", "scifi");
        aliases.put("phim", "movies");
        aliases.put("movie", "movies");
        aliases.put("film", "movies");
        aliases.put("phimtailieu", "documentary");
        aliases.put("documentary", "documentary");
        aliases.put("meme", "meme");
        aliases.put("prank", "prank");
        aliases.put("thuthach", "challenge");
        aliases.put("challenge", "challenge");
        aliases.put("reaction", "reaction");
        aliases.put("react", "reaction");
        aliases.put("asmr", "asmr");
        aliases.put("dongluc", "motivation");
        aliases.put("motivation", "motivation");
        aliases.put("diy", "diy");
        aliases.put("thiennhien", "nature");
        aliases.put("nature", "nature");
        aliases.put("nhiepanh", "photography");
        aliases.put("photography", "photography");
        aliases.put("aothuat", "magic");
        aliases.put("magic", "magic");
        aliases.put("cosplay", "cosplay");
        aliases.put("sach", "books");
        aliases.put("books", "books");
        aliases.put("khoahoc", "science");
        aliases.put("science", "science");
        aliases.put("lichsu", "history");
        aliases.put("history", "history");
        aliases.put("ngoaingu", "language");
        aliases.put("english", "language");
        aliases.put("tienganh", "language");
        aliases.put("suckhoe", "health");
        aliases.put("health", "health");
        aliases.put("treem", "kids");
        aliases.put("kids", "kids");
        aliases.put("baby", "kids");
        aliases.put("damcuoi", "wedding");
        aliases.put("wedding", "wedding");
        aliases.put("dating", "relationships");
        aliases.put("moiquanhe", "relationships");
        aliases.put("sunghiep", "career");
        aliases.put("career", "career");
        aliases.put("batdongsan", "realestate");
        aliases.put("bds", "realestate");
        aliases.put("camtrai", "camping");
        aliases.put("camping", "camping");
        aliases.put("cauca", "fishing");
        aliases.put("fishing", "fishing");
        aliases.put("nongnghiep", "farming");
        aliases.put("farming", "farming");
        aliases.put("unboxing", "unboxing");
        aliases.put("mohop", "unboxing");
        aliases.put("review", "review");
        aliases.put("danhgia", "review");
        aliases.put("podcast", "podcast");
        aliases.put("nhaccu", "instruments");
        aliases.put("guitar", "instruments");
        aliases.put("piano", "instruments");
        aliases.put("kpop", "kpop");
        aliases.put("k_pop", "kpop");
        aliases.put("vpop", "vpop");
        aliases.put("v_pop", "vpop");
        aliases.put("mukbang", "mukbang");
        aliases.put("streetfood", "streetfood");
        aliases.put("amthucduongpho", "streetfood");
        aliases.put("tamlinh", "spirituality");
        aliases.put("viral", "viral");
        aliases.put("xuhuong", "viral");
        aliases.put("fyp", "viral");
        aliases.put("trending", "viral");
        HASHTAG_CATEGORY_ALIASES = Map.copyOf(aliases);
    }

    private final CategoryRepository categoryRepository;

    public CategoryClassifierService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<String> extractHashtags(String title, String description) {
        String text = String.join(" ", String.valueOf(title == null ? "" : title), String.valueOf(description == null ? "" : description));
        Matcher m = HASHTAG_PATTERN.matcher(text);
        java.util.LinkedHashSet<String> tags = new java.util.LinkedHashSet<>();
        while (m.find()) {
            tags.add(normalizeToken(m.group(1)));
        }
        return new ArrayList<>(tags);
    }

    public List<ScoredCategory> inferCategories(String title, String description) {
        return inferCategories(title, description, null);
    }

    public List<ScoredCategory> inferCategories(String title, String description, String audioTitle) {
        String normalizedAudioTitle = normalizeToken(audioTitle);
        // Ignore default auto-generated label to avoid forcing every video into music.
        if (normalizedAudioTitle.startsWith("am thanh goc")) {
            normalizedAudioTitle = "";
        }
        String normalized = normalizeToken(
            String.join(
                " ",
                String.valueOf(title == null ? "" : title),
                String.valueOf(description == null ? "" : description),
                normalizedAudioTitle
            )
        );
        String compact = normalized.replace(" ", "");
        List<Category> enabled = categoryRepository.findByEnabledTrueOrderByNameAsc();
        Map<String, Category> bySlug = enabled.stream().collect(java.util.stream.Collectors.toMap(Category::getSlug, c -> c));

        Map<String, Double> score = new LinkedHashMap<>();
        List<String> tags = extractHashtags(title, description);
        for (String tag : tags) {
            String categorySlug = resolveCategorySlug(tag, bySlug);
            if (categorySlug != null) {
                score.merge(categorySlug, 2.0, Double::sum);
            }
        }
        for (Map.Entry<String, Set<String>> entry : KEYWORDS.entrySet()) {
            if (!bySlug.containsKey(entry.getKey())) {
                continue;
            }
            for (String kw : entry.getValue()) {
                if (containsKeyword(normalized, compact, kw)) {
                    score.merge(entry.getKey(), 1.0, Double::sum);
                }
            }
        }
        List<ScoredCategory> result = score.entrySet().stream()
            .map(e -> new ScoredCategory(bySlug.get(e.getKey()), e.getValue()))
            .filter(sc -> sc.category() != null)
            .sorted(Comparator.comparingDouble(ScoredCategory::score).reversed())
            .limit(3)
            .toList();
        if (!result.isEmpty()) {
            return result;
        }
        return categoryRepository.findBySlugAndEnabledTrue(ALL_CATEGORY_SLUG)
            .map(c -> List.of(new ScoredCategory(c, 1.0)))
            .orElseGet(List::of);
    }

    /**
     * Persist only confident category links. The fallback {@code all} bucket is excluded so
     * unrelated videos do not appear inside specific explore tabs.
     */
    public List<ScoredCategory> selectCategoriesForPersist(List<ScoredCategory> inferred) {
        if (inferred == null || inferred.isEmpty()) {
            return List.of();
        }
        List<ScoredCategory> ranked = inferred.stream()
            .filter(sc -> sc.category() != null && !ALL_CATEGORY_SLUG.equals(sc.category().getSlug()))
            .sorted(Comparator.comparingDouble(ScoredCategory::score).reversed())
            .toList();
        if (ranked.isEmpty()) {
            return List.of();
        }
        ScoredCategory primary = ranked.get(0);
        if (primary.score() < MIN_CATEGORY_SCORE) {
            return List.of();
        }
        List<ScoredCategory> selected = new ArrayList<>();
        selected.add(primary);
        for (int i = 1; i < ranked.size(); i++) {
            ScoredCategory candidate = ranked.get(i);
            if (candidate.score() >= STRONG_CATEGORY_SCORE) {
                selected.add(candidate);
            }
        }
        return selected;
    }

    private String resolveCategorySlug(String tag, Map<String, Category> bySlug) {
        if (bySlug.containsKey(tag)) {
            return tag;
        }
        String alias = HASHTAG_CATEGORY_ALIASES.get(tag);
        if (alias != null && bySlug.containsKey(alias)) {
            return alias;
        }
        // Compound tags like #horrorstory / #truecrimehorror
        if (bySlug.containsKey("horror") && isHorrorCompoundTag(tag)) {
            return "horror";
        }
        return null;
    }

    private static boolean isHorrorCompoundTag(String tag) {
        if (tag == null || tag.isBlank()) {
            return false;
        }
        return tag.contains("horror")
            || tag.contains("truyenma")
            || tag.contains("creepy")
            || tag.contains("creepypasta")
            || tag.contains("halloween")
            || tag.contains("kinhdi")
            || tag.contains("phimma")
            || tag.contains("ghost")
            || tag.contains("truecrime");
    }

    private String normalizeToken(String raw) {
        String lower = String.valueOf(raw).toLowerCase(Locale.ROOT).trim();
        String normalized = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return normalized.replaceAll("[^\\p{L}\\p{N}_\\s]", "");
    }

    private boolean containsKeyword(String normalizedText, String compactText, String keyword) {
        String normalizedKeyword = normalizeToken(keyword);
        if (normalizedKeyword.isBlank()) {
            return false;
        }
        if (normalizedKeyword.contains(" ")) {
            return normalizedText.contains(normalizedKeyword);
        }
        if (matchesToken(normalizedText, normalizedKeyword)) {
            return true;
        }
        String compactKeyword = normalizedKeyword.replace(" ", "");
        return compactKeyword.length() >= 5 && compactText.contains(compactKeyword);
    }

    private boolean matchesToken(String text, String token) {
        if (text.isBlank() || token.isBlank()) {
            return false;
        }
        String pattern = "(?<![\\p{L}\\p{N}_])" + Pattern.quote(token) + "(?![\\p{L}\\p{N}_])";
        return Pattern.compile(pattern, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(text).find();
    }

    public record ScoredCategory(Category category, double score) {
    }
}
