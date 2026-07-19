package com.vibely.automation.support;

import com.vibely.automation.config.ConfigReader;

/**
 * Resolves the default automation login account.
 *
 * <p>Priority: {@code TEST_USER_EMAIL}/{@code TEST_USER_PASSWORD} env vars,
 * then {@code -Dtest.user.email}/{@code -Dtest.user.password},
 * then {@code credentials.local.properties} / {@code config.properties}.</p>
 */
public final class TestCredentials {

    private TestCredentials() {
    }

    /** Test account email / username. */
    public static String email() {
        return firstNonBlank(
                System.getenv("TEST_USER_EMAIL"),
                System.getProperty("test.user.email"),
                ConfigReader.getProperty("test.user.email", ""));
    }

    /** Test account password. */
    public static String password() {
        return firstNonBlank(
                System.getenv("TEST_USER_PASSWORD"),
                System.getProperty("test.user.password"),
                ConfigReader.getProperty("test.user.password", ""));
    }

    /** {@code true} when both email and password are present. */
    public static boolean isConfigured() {
        return !email().isBlank() && !password().isBlank();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }
}
