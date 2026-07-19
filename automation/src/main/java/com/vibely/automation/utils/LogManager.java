package com.vibely.automation.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Centralized structured logging helpers for START / STEP / PASS / FAIL / END messages.
 *
 * <p>Uses SLF4J; never {@code System.out.println}.</p>
 */
public final class LogManager {

    private static final Logger LOGGER = LoggerFactory.getLogger("Vibely.Automation");

    private LogManager() {
    }

    /** Logs the start of a test. */
    public static void startTest(String name) {
        LOGGER.info("START TEST | {}", name);
    }

    /** Logs a high-level step. */
    public static void step(String message) {
        LOGGER.info("STEP | {}", message);
    }

    /** Logs an action. */
    public static void action(String message) {
        LOGGER.info("ACTION | {}", message);
    }

    /** Logs a passing checkpoint. */
    public static void pass(String message) {
        LOGGER.info("PASS | {}", message);
    }

    /** Logs a failure. */
    public static void fail(String message, Throwable error) {
        LOGGER.error("FAIL | {}", message, error);
    }

    /** Logs a warning. */
    public static void warning(String message) {
        LOGGER.warn("WARNING | {}", message);
    }

    /** Logs informational detail. */
    public static void info(String message) {
        LOGGER.info("INFO | {}", message);
    }

    /** Logs the end of a test. */
    public static void endTest(String name) {
        LOGGER.info("END TEST | {}", name);
    }
}
