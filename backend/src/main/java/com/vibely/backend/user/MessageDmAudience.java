package com.vibely.backend.user;

import java.util.Locale;
import java.util.Set;
import org.springframework.util.StringUtils;

/** Nhận tin nhắn từ kết nối tiềm năng / người khác: REQUEST | OFF. */
public final class MessageDmAudience {

    public static final String REQUEST = "REQUEST";
    public static final String OFF = "OFF";
    public static final String DEFAULT = REQUEST;

    private static final Set<String> ALLOWED = Set.of(REQUEST, OFF);

    private MessageDmAudience() {
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

    public static boolean allowsMessaging(String value) {
        return REQUEST.equals(normalizeOrDefault(value));
    }
}
