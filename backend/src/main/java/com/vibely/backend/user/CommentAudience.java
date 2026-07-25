package com.vibely.backend.user;

import java.util.Locale;
import java.util.Set;
import org.springframework.util.StringUtils;

/** Ai được bình luận bài đăng của user: EVERYONE | FRIENDS. */
public final class CommentAudience {

    public static final String EVERYONE = "EVERYONE";
    public static final String FRIENDS = "FRIENDS";
    public static final String DEFAULT = EVERYONE;

    private static final Set<String> ALLOWED = Set.of(EVERYONE, FRIENDS);

    private CommentAudience() {
    }

    public static boolean isAllowed(String value) {
        return StringUtils.hasText(value) && ALLOWED.contains(normalize(value));
    }

    public static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    public static String normalizeOrDefault(String value) {
        String normalized = normalize(value);
        return isAllowed(normalized) ? normalized : DEFAULT;
    }
}
