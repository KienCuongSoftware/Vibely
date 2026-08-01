package com.vibely.automation.support;

import com.vibely.automation.config.ConfigReader;

/**
 * Resolves automation accounts A (primary) and B (peer for DM tests).
 *
 * <p>Priority for each field: env → {@code -D} → {@code credentials.local.properties}.</p>
 */
public final class TestCredentials {

    private TestCredentials() {
    }

    /** Account A email / username (login). */
    public static String email() {
        return firstNonBlank(
                System.getenv("TEST_USER_EMAIL"),
                System.getProperty("test.user.email"),
                ConfigReader.getProperty("test.user.email", ""));
    }

    /** Account A password. */
    public static String password() {
        return firstNonBlank(
                System.getenv("TEST_USER_PASSWORD"),
                System.getProperty("test.user.password"),
                ConfigReader.getProperty("test.user.password", ""));
    }

    /** Account A public username (without {@code @}), used when B opens the thread. */
    public static String username() {
        return stripAt(firstNonBlank(
                System.getenv("TEST_USER_USERNAME"),
                System.getProperty("test.user.username"),
                ConfigReader.getProperty("test.user.username", "")));
    }

    /** Account B email. */
    public static String peerEmail() {
        return firstNonBlank(
                System.getenv("TEST_USER_B_EMAIL"),
                System.getProperty("test.user.b.email"),
                ConfigReader.getProperty("test.user.b.email", ""));
    }

    /** Account B password. */
    public static String peerPassword() {
        return firstNonBlank(
                System.getenv("TEST_USER_B_PASSWORD"),
                System.getProperty("test.user.b.password"),
                ConfigReader.getProperty("test.user.b.password", ""));
    }

    /** Account B public username (without {@code @}) — profile visited by A. */
    public static String peerUsername() {
        return stripAt(firstNonBlank(
                System.getenv("TEST_USER_B_USERNAME"),
                System.getProperty("test.user.b.username"),
                ConfigReader.getProperty("test.user.b.username", "")));
    }

    /** {@code true} when account A credentials are present. */
    public static boolean isConfigured() {
        return !email().isBlank() && !password().isBlank();
    }

    /** {@code true} when A + B credentials and B username are present. */
    public static boolean isPeerDmConfigured() {
        return isConfigured()
                && !peerEmail().isBlank()
                && !peerPassword().isBlank()
                && !peerUsername().isBlank();
    }

    private static String stripAt(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.startsWith("@") ? trimmed.substring(1) : trimmed;
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
