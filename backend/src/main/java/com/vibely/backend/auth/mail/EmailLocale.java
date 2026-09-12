package com.vibely.backend.auth.mail;

/**
 * Transactional email copy is currently EN or VI.
 * Other UI locales fall back to English until more templates exist.
 */
public enum EmailLocale {
    EN,
    VI;

    public boolean vietnamese() {
        return this == VI;
    }

    public String htmlLang() {
        return vietnamese() ? "vi" : "en";
    }
}
