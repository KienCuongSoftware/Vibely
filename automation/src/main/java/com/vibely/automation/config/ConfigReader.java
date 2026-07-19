package com.vibely.automation.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.NoSuchElementException;
import java.util.Properties;

/**
 * Loads and exposes the values defined in {@code config.properties} on the test classpath.
 *
 * <p>The properties file is loaded once, lazily, on class initialization and cached for the
 * lifetime of the JVM.</p>
 */
public final class ConfigReader {

    private static final String CONFIG_FILE = "config.properties";
    private static final String LOCAL_CREDENTIALS_FILE = "credentials.local.properties";
    private static final Properties PROPERTIES = load();

    private ConfigReader() {
    }

    private static Properties load() {
        Properties properties = new Properties();
        try (InputStream inputStream = ConfigReader.class.getClassLoader().getResourceAsStream(CONFIG_FILE)) {
            if (inputStream == null) {
                throw new IllegalStateException("Configuration file '" + CONFIG_FILE + "' was not found on the classpath");
            }
            properties.load(inputStream);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load configuration file '" + CONFIG_FILE + "'", e);
        }
        // Optional local overrides (gitignored) — e.g. test.user.email / test.user.password
        try (InputStream local = ConfigReader.class.getClassLoader().getResourceAsStream(LOCAL_CREDENTIALS_FILE)) {
            if (local != null) {
                properties.load(local);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load '" + LOCAL_CREDENTIALS_FILE + "'", e);
        }
        return properties;
    }

    /**
     * Returns the value of the given property.
     *
     * @param key the property key
     * @return the trimmed property value
     * @throws NoSuchElementException if the key is not present in {@code config.properties}
     */
    public static String getProperty(String key) {
        String override = System.getProperty(key);
        if (override != null && !override.isBlank()) {
            return override.trim();
        }
        String value = PROPERTIES.getProperty(key);
        if (value == null) {
            throw new NoSuchElementException("Property '" + key + "' was not found in " + CONFIG_FILE);
        }
        return value.trim();
    }

    /**
     * Returns the value of the given property, or {@code defaultValue} if the key is absent.
     *
     * @param key          the property key
     * @param defaultValue the fallback value
     * @return the trimmed property value, or {@code defaultValue}
     */
    public static String getProperty(String key, String defaultValue) {
        String override = System.getProperty(key);
        if (override != null && !override.isBlank()) {
            return override.trim();
        }
        String value = PROPERTIES.getProperty(key);
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    /**
     * Returns the value of the given property parsed as an {@code int}, or {@code defaultValue}
     * if the key is absent or blank.
     *
     * @param key          the property key
     * @param defaultValue the fallback value
     * @return the parsed integer value, or {@code defaultValue}
     */
    public static int getIntProperty(String key, int defaultValue) {
        String override = System.getProperty(key);
        if (override != null && !override.isBlank()) {
            return Integer.parseInt(override.trim());
        }
        String value = PROPERTIES.getProperty(key);
        return value == null || value.isBlank() ? defaultValue : Integer.parseInt(value.trim());
    }

    /**
     * Returns the value of the given property parsed as a {@code boolean}, or
     * {@code defaultValue} if the key is absent or blank.
     *
     * @param key          the property key
     * @param defaultValue the fallback value
     * @return the parsed boolean value, or {@code defaultValue}
     */
    public static boolean getBooleanProperty(String key, boolean defaultValue) {
        String override = System.getProperty(key);
        if (override != null && !override.isBlank()) {
            return Boolean.parseBoolean(override.trim());
        }
        String value = PROPERTIES.getProperty(key);
        return value == null || value.isBlank() ? defaultValue : Boolean.parseBoolean(value.trim());
    }
}
