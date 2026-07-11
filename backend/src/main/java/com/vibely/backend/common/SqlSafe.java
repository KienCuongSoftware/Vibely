package com.vibely.backend.common;

import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/**
 * Helpers for safe database access. Primary SQL-injection defense is always
 * parameterized queries ({@code @Param}, {@code ?}); these utilities add
 * defense-in-depth for LIKE patterns, slugs, and pagination bounds.
 */
public final class SqlSafe {

    private static final Pattern IDENTIFIER_SLUG = Pattern.compile("^[a-z0-9](?:[a-z0-9_-]{0,62})?$");
    private static final Pattern REGEX_META = Pattern.compile("([\\\\.^$|?*+()\\[\\]{}-])");

    private SqlSafe() {
    }

    /** Escapes {@code %}, {@code _}, and {@code \} for SQL {@code LIKE} patterns. */
    public static String escapeLike(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }
        StringBuilder escaped = new StringBuilder(raw.length() + 8);
        for (int index = 0; index < raw.length(); index++) {
            char character = raw.charAt(index);
            if (character == '\\' || character == '%' || character == '_') {
                escaped.append('\\').append(character);
                continue;
            }
            if (!Character.isISOControl(character)) {
                escaped.append(character);
            }
        }
        return escaped.toString();
    }

    /** Escapes user input used in PostgreSQL regex operators ({@code ~}, {@code ~*}). */
    public static String escapeRegexLiteral(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }
        return REGEX_META.matcher(stripControlCharacters(raw.trim())).replaceAll("\\\\$1");
    }

    /**
     * Normalizes whitespace, strips control characters, caps length, and escapes LIKE wildcards.
     */
    public static String sanitizeLikeTerm(String raw, int maxLength) {
        if (raw == null) {
            return "";
        }
        String normalized = stripControlCharacters(raw.trim().replaceAll("\\s+", " "));
        if (normalized.length() > maxLength) {
            normalized = normalized.substring(0, maxLength);
        }
        return escapeLike(normalized);
    }

    /**
     * Validates explore/category slugs before they are bound as query parameters.
     */
    public static String requireIdentifierSlug(String raw) {
        if (raw == null) {
            throw new BadRequestException("Slug không hợp lệ");
        }
        String normalized = stripControlCharacters(raw.trim().toLowerCase(Locale.ROOT));
        if (!IDENTIFIER_SLUG.matcher(normalized).matches()) {
            throw new BadRequestException("Slug không hợp lệ");
        }
        return normalized;
    }

    public static int clampPage(int page) {
        return Math.max(page, 0);
    }

    public static int clampPageSize(int size, int min, int max) {
        return Math.min(Math.max(size, min), max);
    }

    public static PageRequest pageRequest(int page, int size, int maxSize) {
        return PageRequest.of(clampPage(page), clampPageSize(size, 1, maxSize));
    }

    public static PageRequest pageRequest(int page, int size, int maxSize, Sort sort) {
        if (sort == null) {
            throw new IllegalArgumentException("sort is required");
        }
        if (sort.isUnsorted()) {
            return pageRequest(page, size, maxSize);
        }
        for (Sort.Order order : sort) {
            requireAllowedSortProperty(order.getProperty());
        }
        return PageRequest.of(clampPage(page), clampPageSize(size, 1, maxSize), sort);
    }

    /**
     * Rejects dynamic sort fields from ever reaching the query layer.
     */
    public static void requireAllowedSortProperty(String property) {
        if (property == null || !property.matches("[a-zA-Z][a-zA-Z0-9_.]{0,63}")) {
            throw new BadRequestException("Trường sắp xếp không hợp lệ");
        }
    }

    static String stripControlCharacters(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }
        StringBuilder cleaned = new StringBuilder(raw.length());
        for (int index = 0; index < raw.length(); index++) {
            char character = raw.charAt(index);
            if (character != 0 && !Character.isISOControl(character)) {
                cleaned.append(character);
            }
        }
        return cleaned.toString();
    }
}
