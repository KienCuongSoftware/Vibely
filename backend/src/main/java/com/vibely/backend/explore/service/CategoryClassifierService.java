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
    private static final Map<String, Set<String>> KEYWORDS = Map.of(
        "music", Set.of(
            "music", "song", "amnhac", "am nhac", "nhac", "remix", "cover",
            "lyrics", "lyric", "karaoke", "sing", "audio", "am thanh",
            "sound", "soundtrack", "melody", "lofi", "ballad", "rap", "hiphop", "edm"
        ),
        "dance", Set.of("dance", "nhay", "choreography"),
        "food", Set.of("food", "monan", "anuong", "recipe", "nauan"),
        "travel", Set.of("travel", "dulich", "trip", "review"),
        "gaming", Set.of("game", "gaming", "esports"),
        "beauty", Set.of("beauty", "makeup", "lamdep", "skincare"),
        "fitness", Set.of("fitness", "gym", "workout"),
        "comedy", Set.of("funny", "hai", "comedy"),
        "technology", Set.of("tech", "congnghe", "ai", "coding")
    );

    /** Hashtags that should map to a explore category slug (not 1:1 with tag name). */
    private static final Map<String, String> HASHTAG_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("lyrics", "music"),
        Map.entry("lyric", "music"),
        Map.entry("lyricvideo", "music"),
        Map.entry("singing", "music"),
        Map.entry("sing", "music"),
        Map.entry("karaoke", "music"),
        Map.entry("nhac", "music"),
        Map.entry("amnhac", "music"),
        Map.entry("remix", "music"),
        Map.entry("cover", "music"),
        Map.entry("audio", "music"),
        Map.entry("sound", "music"),
        Map.entry("beat", "music"),
        Map.entry("edm", "music"),
        Map.entry("hiphop", "music"),
        Map.entry("choreography", "dance"),
        Map.entry("dancing", "dance"),
        Map.entry("nhay", "dance"),
        Map.entry("monan", "food"),
        Map.entry("anuong", "food"),
        Map.entry("nauan", "food"),
        Map.entry("dulich", "travel"),
        Map.entry("lamdep", "beauty"),
        Map.entry("makeup", "beauty"),
        Map.entry("skincare", "beauty"),
        Map.entry("congnghe", "technology"),
        Map.entry("coding", "technology"),
        Map.entry("anime", "anime"),
        Map.entry("manga", "anime")
    );

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
        return categoryRepository.findBySlugAndEnabledTrue("all")
            .map(c -> List.of(new ScoredCategory(c, 1.0)))
            .orElseGet(List::of);
    }

    private String resolveCategorySlug(String tag, Map<String, Category> bySlug) {
        if (bySlug.containsKey(tag)) {
            return tag;
        }
        String alias = HASHTAG_CATEGORY_ALIASES.get(tag);
        if (alias != null && bySlug.containsKey(alias)) {
            return alias;
        }
        return null;
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
        if (normalizedText.contains(normalizedKeyword)) {
            return true;
        }
        String compactKeyword = normalizedKeyword.replace(" ", "");
        return !compactKeyword.isBlank() && compactText.contains(compactKeyword);
    }

    public record ScoredCategory(Category category, double score) {
    }
}
