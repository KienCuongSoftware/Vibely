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
                String normalized = PreferredLocaleCodes.normalizeOrDefault(raw);
                return EmailLocale.of(MailCopy.supportedTag(normalized));
            }
        }
        return EmailLocale.EN;
    }

    /** @deprecated use {@link MailCopy#get(EmailLocale, String, Object...)} */
    public static String pick(EmailLocale locale, String english, String vietnamese) {
        if (locale != null && "vi".equalsIgnoreCase(locale.tag())) {
            return vietnamese;
        }
        return english;
    }
}
