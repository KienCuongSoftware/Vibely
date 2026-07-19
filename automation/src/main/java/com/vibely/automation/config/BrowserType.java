package com.vibely.automation.config;

import java.util.Arrays;
import java.util.Locale;

/**
 * Enumerates the browsers supported by the automation suite.
 */
public enum BrowserType {

    BRAVE,
    CHROME,
    EDGE,
    FIREFOX;

    /**
     * Resolves a {@link BrowserType} from its case-insensitive string representation, as read
     * from {@code config.properties} (e.g. the {@code browser} key).
     *
     * @param value the raw browser name
     * @return the matching {@link BrowserType}
     * @throws IllegalArgumentException if {@code value} is blank or does not match any known browser
     */
    public static BrowserType fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Browser name must not be null or blank");
        }
        try {
            return BrowserType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Unsupported browser: '" + value + "'. Supported values: " + Arrays.toString(values()), e);
        }
    }
}
