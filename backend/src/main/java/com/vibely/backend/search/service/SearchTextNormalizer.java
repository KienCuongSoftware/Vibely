package com.vibely.backend.search.service;

import java.text.Normalizer;
import java.util.Locale;

public final class SearchTextNormalizer {

    private static final String VI_FROM =
        "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ"
            + "ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ";
    private static final String VI_TO =
        "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy"
            + "AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY";

    private SearchTextNormalizer() {
    }

    public static String normalizeQuery(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
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
        if (normalized.length() > 200) {
            return normalized.substring(0, 200);
        }
        return normalized;
    }
}
