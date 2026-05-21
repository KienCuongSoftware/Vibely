package com.vibely.backend.share;

import java.util.Locale;

public enum ShareChannel {
    COPY,
    NATIVE,
    FACEBOOK,
    MESSENGER,
    WHATSAPP,
    TELEGRAM,
    TWITTER,
    EMBED,
    OTHER;

    public static ShareChannel from(String raw) {
        if (raw == null || raw.isBlank()) {
            return COPY;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return ShareChannel.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return OTHER;
        }
    }

    public String wireValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
