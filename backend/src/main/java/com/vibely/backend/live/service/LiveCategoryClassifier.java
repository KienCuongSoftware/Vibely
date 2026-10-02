package com.vibely.backend.live.service;

import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.explore.service.CategoryClassifierService.ScoredCategory;
import com.vibely.backend.live.entity.LiveCategory;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Picks the LIVE category from the title/description with the Explore classifier, so a LIVE
 * lands in the same kind of bucket its videos would. Explore has no per-game categories, so
 * Free Fire / PUBG / other game titles are recognised here first. Unclassifiable → LIFESTYLE,
 * mirroring the Explore fallback tab.
 */
@Component
public class LiveCategoryClassifier {

    private static final Logger log = LoggerFactory.getLogger(LiveCategoryClassifier.class);

    private static final Set<String> FREEFIRE_KEYWORDS = Set.of("free fire", "freefire", "ff", "ffmax", "ff max");
    private static final Set<String> PUBG_KEYWORDS = Set.of("pubg", "pubgm", "pubg mobile");
    private static final Set<String> GAME_KEYWORDS = Set.of(
        "game", "games", "gaming", "gamer", "lien quan", "lienquan", "aov", "valorant", "minecraft",
        "roblox", "gta", "cs2", "csgo", "lmht", "lol", "tft", "genshin", "fifa", "fc online", "dota"
    );

    private static final Map<String, LiveCategory> EXPLORE_TO_LIVE = Map.ofEntries(
        Map.entry("gaming", LiveCategory.GAMING),
        Map.entry("music", LiveCategory.MUSIC),
        Map.entry("instruments", LiveCategory.MUSIC),
        Map.entry("kpop", LiveCategory.MUSIC),
        Map.entry("vpop", LiveCategory.MUSIC),
        Map.entry("dance", LiveCategory.MUSIC),
        Map.entry("food", LiveCategory.FOOD),
        Map.entry("mukbang", LiveCategory.FOOD),
        Map.entry("streetfood", LiveCategory.FOOD),
        Map.entry("travel", LiveCategory.OUTDOOR),
        Map.entry("nature", LiveCategory.OUTDOOR),
        Map.entry("camping", LiveCategory.OUTDOOR),
        Map.entry("fishing", LiveCategory.OUTDOOR),
        Map.entry("farming", LiveCategory.OUTDOOR),
        Map.entry("sports", LiveCategory.OUTDOOR),
        Map.entry("fitness", LiveCategory.OUTDOOR),
        Map.entry("automotive", LiveCategory.OUTDOOR),
        Map.entry("podcast", LiveCategory.CHAT),
        Map.entry("relationships", LiveCategory.CHAT),
        Map.entry("language", LiveCategory.CHAT),
        Map.entry("education", LiveCategory.CHAT),
        Map.entry("career", LiveCategory.CHAT),
        Map.entry("motivation", LiveCategory.CHAT),
        Map.entry("news", LiveCategory.CHAT),
        Map.entry("books", LiveCategory.CHAT),
        Map.entry("reaction", LiveCategory.CHAT)
    );

    private final CategoryClassifierService exploreClassifier;

    public LiveCategoryClassifier(CategoryClassifierService exploreClassifier) {
        this.exploreClassifier = exploreClassifier;
    }

    public LiveCategory classify(String title, String description) {
        String text = normalize(String.join(" ", nullToEmpty(title), nullToEmpty(description)));
        if (containsAny(text, FREEFIRE_KEYWORDS)) {
            return LiveCategory.FREEFIRE;
        }
        if (containsAny(text, PUBG_KEYWORDS)) {
            return LiveCategory.PUBG;
        }
        Optional<LiveCategory> fromExplore = fromExplore(title, description);
        if (fromExplore.isPresent()) {
            return fromExplore.get();
        }
        return containsAny(text, GAME_KEYWORDS) ? LiveCategory.GAMING : LiveCategory.LIFESTYLE;
    }

    private Optional<LiveCategory> fromExplore(String title, String description) {
        try {
            List<ScoredCategory> inferred = exploreClassifier.inferCategories(title, description);
            return inferred.stream()
                .filter(scored -> scored.category() != null)
                .map(scored -> EXPLORE_TO_LIVE.get(scored.category().getSlug()))
                .filter(category -> category != null)
                .findFirst();
        } catch (RuntimeException e) {
            // Categorisation is best effort; creating the LIVE must not fail because of it.
            log.warn("live.category.classify_failed reason={}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static boolean containsAny(String text, Set<String> keywords) {
        if (text.isBlank()) {
            return false;
        }
        return keywords.stream().anyMatch(keyword -> containsToken(text, keyword));
    }

    private static boolean containsToken(String text, String keyword) {
        String pattern = "(?<![\\p{L}\\p{N}])" + Pattern.quote(keyword) + "(?![\\p{L}\\p{N}])";
        return Pattern.compile(pattern).matcher(text).find();
    }

    private static String normalize(String raw) {
        String lower = raw.toLowerCase(Locale.ROOT).replace('đ', 'd');
        String stripped = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return stripped.replaceAll("[^\\p{L}\\p{N}\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
