package com.vibely.backend.live.entity;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/** LIVE categories; sub-categories roll up to a group so filtering by a group includes its children. */
public enum LiveCategory {
    GAMING(null),
    LIFESTYLE(null),
    FREEFIRE(GAMING),
    PUBG(GAMING),
    MUSIC(LIFESTYLE),
    OUTDOOR(LIFESTYLE),
    CHAT(LIFESTYLE),
    FOOD(LIFESTYLE);

    private final LiveCategory group;

    LiveCategory(LiveCategory group) {
        this.group = group;
    }

    public LiveCategory group() {
        return group == null ? this : group;
    }

    /** The category itself plus every category that rolls up to it. */
    public List<LiveCategory> withChildren() {
        return Arrays.stream(values())
            .filter(category -> category == this || category.group == this)
            .toList();
    }

    public static Optional<LiveCategory> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String normalized = raw.trim().replace("-", "").replace("_", "").toUpperCase(Locale.ROOT);
        return Arrays.stream(values()).filter(category -> category.name().equals(normalized)).findFirst();
    }
}
