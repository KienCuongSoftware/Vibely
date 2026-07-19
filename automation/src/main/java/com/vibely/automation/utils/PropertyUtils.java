package com.vibely.automation.utils;

import com.vibely.automation.config.ConfigReader;

/**
 * Thin, convenience wrapper around {@link ConfigReader} exposing a few commonly used,
 * strongly-typed configuration accessors.
 */
public final class PropertyUtils {

    private PropertyUtils() {
    }

    /**
     * Returns the raw string value of the given property.
     *
     * @param key the property key
     * @return the property value
     */
    public static String get(String key) {
        return ConfigReader.getProperty(key);
    }

    /**
     * Returns the raw string value of the given property, or {@code defaultValue} if absent.
     *
     * @param key          the property key
     * @param defaultValue the fallback value
     * @return the property value, or {@code defaultValue}
     */
    public static String get(String key, String defaultValue) {
        return ConfigReader.getProperty(key, defaultValue);
    }

    /**
     * Returns the integer value of the given property, or {@code defaultValue} if absent.
     *
     * @param key          the property key
     * @param defaultValue the fallback value
     * @return the parsed integer value
     */
    public static int getInt(String key, int defaultValue) {
        return ConfigReader.getIntProperty(key, defaultValue);
    }

    /**
     * Returns the boolean value of the given property, or {@code defaultValue} if absent.
     *
     * @param key          the property key
     * @param defaultValue the fallback value
     * @return the parsed boolean value
     */
    public static boolean getBoolean(String key, boolean defaultValue) {
        return ConfigReader.getBooleanProperty(key, defaultValue);
    }

    /**
     * Returns the {@code base.url} configured for the application under test.
     *
     * @return the base URL
     */
    public static String baseUrl() {
        return get("base.url", "");
    }

    /**
     * Returns the configured explicit wait {@code timeout} in seconds.
     *
     * @return the timeout, in seconds
     */
    public static int timeoutSeconds() {
        return getInt("timeout", 10);
    }

    /**
     * Returns the configured {@code environment} name (e.g. Local, Staging, Production).
     *
     * @return the environment name
     */
    public static String environment() {
        return get("environment", "Local");
    }
}
