package com.vibely.backend.user;

import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/** UI language codes persisted on the user (frontend i18n), e.g. en, vi, zh-Hans. */
public final class PreferredLocaleCodes {

    public static final String DEFAULT = "en";
    private static final Pattern SAFE = Pattern.compile("^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8}){0,3}$");

    private PreferredLocaleCodes() {
    }

    public static String normalizeOrDefault(String raw) {
        String normalized = normalize(raw);
        return StringUtils.hasText(normalized) ? normalized : DEFAULT;
    }

    public static String normalize(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String value = raw.trim().replace('_', '-');
        if (value.length() > 16) {
            value = value.substring(0, 16);
        }
        if (!SAFE.matcher(value).matches()) {
            return "";
        }
        String[] parts = value.split("-", 4);
        StringBuilder out = new StringBuilder(parts[0].toLowerCase(Locale.ROOT));
        for (int i = 1; i < parts.length; i++) {
            out.append('-');
            String part = parts[i];
            if (part.length() <= 3) {
                out.append(part.toUpperCase(Locale.ROOT));
            } else {
                out.append(Character.toUpperCase(part.charAt(0)))
                    .append(part.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return out.toString();
    }

    public static boolean isAllowed(String raw) {
        return StringUtils.hasText(normalize(raw));
    }
}
