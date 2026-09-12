package com.vibely.backend.auth.mail;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Transactional email strings keyed by UI locale (same codes as the web app).
 */
public final class MailCopy {

    private static final Logger log = LoggerFactory.getLogger(MailCopy.class);
    private static final Map<String, Map<String, String>> BUNDLES = load();
    private static final Set<String> TAGS = Set.copyOf(BUNDLES.keySet());

    private MailCopy() {
    }

    public static String get(EmailLocale locale, String key, Object... args) {
        String tag = locale == null ? "en" : supportedTag(locale.tag());
        String pattern = lookup(tag, key);
        if (args == null || args.length == 0 || pattern == null) {
            return pattern == null ? key : pattern;
        }
        String out = pattern;
        for (int i = 0; i < args.length; i++) {
            out = out.replace("{" + i + "}", args[i] == null ? "" : String.valueOf(args[i]));
        }
        return out;
    }

    public static String supportedTag(String requested) {
        if (requested == null || requested.isBlank()) {
            return "en";
        }
        if (TAGS.contains(requested)) {
            return requested;
        }
        String lower = requested.toLowerCase();
        for (String tag : TAGS) {
            if (tag.equalsIgnoreCase(requested)) {
                return tag;
            }
        }
        int dash = requested.indexOf('-');
        if (dash > 0) {
            String language = requested.substring(0, dash);
            if (TAGS.contains(language)) {
                return language;
            }
            if ("zh".equalsIgnoreCase(language)) {
                return TAGS.contains("zh-Hans") ? "zh-Hans" : "en";
            }
        }
        for (String tag : TAGS) {
            if (tag.toLowerCase().startsWith(lower + "-") || lower.startsWith(tag.toLowerCase() + "-")) {
                return tag;
            }
        }
        return "en";
    }

    public static Set<String> tags() {
        return TAGS;
    }

    private static String lookup(String tag, String key) {
        Map<String, String> bundle = BUNDLES.getOrDefault(tag, Map.of());
        String value = bundle.get(key);
        if (value != null) {
            return value;
        }
        Map<String, String> en = BUNDLES.getOrDefault("en", Map.of());
        return en.getOrDefault(key, key);
    }

    private static Map<String, Map<String, String>> load() {
        try (InputStream in = MailCopy.class.getResourceAsStream("/mail/messages.json")) {
            if (in == null) {
                log.error("mail/messages.json missing from classpath");
                return Map.of("en", Map.of());
            }
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Map<String, String>> parsed = mapper.readValue(in, new TypeReference<>() {});
            return parsed == null ? Map.of("en", Map.of()) : parsed;
        } catch (Exception e) {
            log.error("Failed to load mail/messages.json", e);
            return Map.of("en", Map.of());
        }
    }

    static Set<String> orderedTags() {
        return new LinkedHashSet<>(TAGS);
    }
}
