package com.vibely.backend.search.service;

import java.text.Normalizer;
import java.util.Locale;

public final class SearchTextNormalizer {

    public static final int MAX_QUERY_LENGTH = 200;

    private static final String VI_FROM =
        "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ"
            + "ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ";
    private static final String VI_TO =
        "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy"
            + "AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY";

    private SearchTextNormalizer() {
    }

    /**
     * Canonical user search text for history/URL display:
     * trim, collapse spaces, strip controls / markup chars, lowercase, length cap.
     * Keeps Vietnamese accents (folding is {@link #foldForSearch}).
     */
    public static String normalizeQuery(String raw) {
        if (raw == null) {
            return "";
        }
        StringBuilder cleaned = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c == '<' || c == '>' || c == '"' || c == '\'' || c == '`') {
                continue;
            }
            if (Character.isISOControl(c)) {
                if (c == '\n' || c == '\r' || c == '\t') {
                    cleaned.append(' ');
                }
                continue;
            }
            cleaned.append(c);
        }
        String normalized = cleaned.toString().trim().replaceAll("\\s+", " ");
        if (normalized.startsWith("#")) {
            normalized = normalized.substring(1).trim();
        }
        if (normalized.length() > MAX_QUERY_LENGTH) {
            normalized = normalized.substring(0, MAX_QUERY_LENGTH).trim();
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    /**
     * Lowercase + strip Vietnamese/Latin diacritics so {@code hinh nen dong}
     * matches {@code Hình nền động}.
     */
    public static String foldForSearch(String raw) {
        String normalized = normalizeQuery(raw);
        if (normalized.isEmpty()) {
            return "";
        }
        StringBuilder mapped = new StringBuilder(normalized.length());
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            int idx = VI_FROM.indexOf(c);
            if (idx >= 0) {
                mapped.append(VI_TO.charAt(idx));
            } else if (c == 'đ' || c == 'Đ') {
                mapped.append('d');
            } else {
                mapped.append(c);
            }
        }
        String ascii = Normalizer.normalize(mapped.toString(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "");
        return ascii.toLowerCase(Locale.ROOT);
    }

    public static String normalizeTrendKeyword(String query) {
        String normalized = foldForSearch(query);
        if (normalized.length() > MAX_QUERY_LENGTH) {
            return normalized.substring(0, MAX_QUERY_LENGTH);
        }
        return normalized;
    }
}
