package com.vibely.backend.auth.mail;

import com.vibely.backend.user.PreferredLocaleCodes;
import java.util.Locale;
import org.springframework.util.StringUtils;

public final class EmailLocales {

    private EmailLocales() {
    }

    public static EmailLocale resolve(String... candidates) {
        if (candidates != null) {
            for (String raw : candidates) {
                if (!StringUtils.hasText(raw)) {
                    continue;
                }
                String normalized = PreferredLocaleCodes.normalizeOrDefault(raw).toLowerCase(Locale.ROOT);
                if (normalized.equals("vi") || normalized.startsWith("vi-")) {
                    return EmailLocale.VI;
                }
                return EmailLocale.EN;
            }
        }
        return EmailLocale.EN;
    }

    public static String pick(EmailLocale locale, String english, String vietnamese) {
        return locale != null && locale.vietnamese() ? vietnamese : english;
    }
}
