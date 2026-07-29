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

    /**
     * Password for signup happy-path tests (8–20 chars, letters + digits + special).
     *
     * <p>Override with {@code TEST_SIGNUP_PASSWORD} / {@code test.signup.password}.</p>
     */
    public static String signupPassword() {
        String configured = firstNonBlank(
                System.getenv("TEST_SIGNUP_PASSWORD"),
                System.getProperty("test.signup.password"),
                ConfigReader.getProperty("test.signup.password", ""));
        return configured.isBlank() ? "AutoTest@1234" : configured;
    }

    /**
     * Optional fixed OTP when email delivery is enabled and {@code demoCode} is not returned.
     *
     * <p>Override with {@code TEST_SIGNUP_OTP} / {@code test.signup.otp}.</p>
     */
    public static String signupOtp() {
        return firstNonBlank(
                System.getenv("TEST_SIGNUP_OTP"),
                System.getProperty("test.signup.otp"),
                ConfigReader.getProperty("test.signup.otp", ""));
    }

    /**
     * Unique email for signup (avoids collisions). Prefix override:
     * {@code test.signup.email.prefix} (default {@code vibely.auto}).
     */
    public static String uniqueSignupEmail() {
        String fixed = firstNonBlank(
                System.getenv("TEST_SIGNUP_EMAIL"),
                System.getProperty("test.signup.email"),
                ConfigReader.getProperty("test.signup.email", ""));
        if (!fixed.isBlank()) {
            return fixed;
        }
        String prefix = firstNonBlank(
                System.getenv("TEST_SIGNUP_EMAIL_PREFIX"),
                System.getProperty("test.signup.email.prefix"),
                ConfigReader.getProperty("test.signup.email.prefix", "vibely.auto"));
        return prefix + "." + System.currentTimeMillis() + "@example.com";
    }

    /**
     * Unique Vibely ID for signup. Override with {@code TEST_SIGNUP_USERNAME} /
     * {@code test.signup.username}.
     */
    public static String uniqueSignupUsername() {
        String fixed = firstNonBlank(
                System.getenv("TEST_SIGNUP_USERNAME"),
                System.getProperty("test.signup.username"),
                ConfigReader.getProperty("test.signup.username", ""));
        if (!fixed.isBlank()) {
            return stripAt(fixed);
        }
        String suffix = Long.toString(System.currentTimeMillis() % 1_000_000_000L, 36);
        return "auto" + suffix;
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
