package com.vibely.backend.auth.mail;

import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** UI language tag used to pick transactional email copy (e.g. en, vi, zh-Hans). */
public final class EmailLocale {

    public static final EmailLocale EN = new EmailLocale("en");

    private static final Set<String> RTL = Set.of("ar", "he", "ur");

    private final String tag;

    private EmailLocale(String tag) {
        this.tag = tag;
    }

    public static EmailLocale of(String tag) {
        if (tag == null || tag.isBlank()) {
            return EN;
        }
        return new EmailLocale(tag);
    }

    public String tag() {
        return tag;
    }

    public String htmlLang() {
        return tag;
    }

    public boolean rtl() {
        String language = tag.contains("-") ? tag.substring(0, tag.indexOf('-')) : tag;
        return RTL.contains(language.toLowerCase(Locale.ROOT));
    }

    public Locale toJavaLocale() {
        return Locale.forLanguageTag(tag);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof EmailLocale other)) {
            return false;
        }
        return tag.equalsIgnoreCase(other.tag);
    }

    @Override
    public int hashCode() {
        return Objects.hash(tag.toLowerCase(Locale.ROOT));
    }

    @Override
    public String toString() {
        return tag;
    }
}
