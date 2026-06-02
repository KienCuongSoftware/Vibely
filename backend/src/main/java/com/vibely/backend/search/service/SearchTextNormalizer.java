package com.vibely.backend.search.service;

import java.util.Locale;

public final class SearchTextNormalizer {

    private SearchTextNormalizer() {
    }

    public static String normalizeQuery(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }

    public static String normalizeTrendKeyword(String query) {
        String normalized = normalizeQuery(query).toLowerCase(Locale.ROOT);
        if (normalized.length() > 200) {
            return normalized.substring(0, 200);
        }
        return normalized;
    }
}
