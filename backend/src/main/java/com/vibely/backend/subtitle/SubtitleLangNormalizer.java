package com.vibely.backend.subtitle;

import org.springframework.util.StringUtils;

/** Normalize UI / Whisper / Vibely locale codes to canonical ISO for track storage. */
public final class SubtitleLangNormalizer {

    private SubtitleLangNormalizer() {}

    public static String normalize(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String value = raw.trim().toLowerCase().replace('_', '-');
        if (value.startsWith("zh-hant") || value.equals("zh-tw") || value.equals("zh-hk")) {
            return "zh-hant";
        }
        if (value.startsWith("zh-hans") || value.equals("zh-cn") || value.equals("zh")) {
            return "zh";
        }
        // Vibely regional variants → base track language for NLLB.
        if (value.equals("en-gb")) {
            return "en";
        }
        if (value.equals("pt-br")) {
            return "pt";
        }
        if (value.equals("es-419") || value.startsWith("es-")) {
            return "es";
        }
        if (value.equals("fr-ca")) {
            return "fr";
        }
        if (value.equals("fil")) {
            return "tl";
        }
        int dash = value.indexOf('-');
        if (dash > 0 && !value.startsWith("zh")) {
            return value.substring(0, dash);
        }
        return value;
    }

    public static boolean sameLanguage(String a, String b) {
        String na = normalize(a);
        String nb = normalize(b);
        return na != null && na.equals(nb);
    }
}
