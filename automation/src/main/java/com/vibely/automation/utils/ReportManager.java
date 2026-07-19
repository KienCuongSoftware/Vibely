package com.vibely.automation.utils;

import io.qameta.allure.Allure;

import java.io.ByteArrayInputStream;
import java.util.function.Supplier;

/**
 * Convenience helpers for adding Allure steps, parameters and attachments from test/page-object
 * code without depending directly on Allure's functional-interface types.
 */
public final class ReportManager {

    private ReportManager() {
    }

    /**
     * Records a passed Allure step with the given name.
     *
     * @param name the step name shown in the report
     */
    public static void step(String name) {
        Allure.step(name);
    }

    /**
     * Executes {@code action} wrapped in an Allure step named {@code name}.
     *
     * @param name   the step name shown in the report
     * @param action the action to execute
     */
    public static void step(String name, Runnable action) {
        Allure.step(name, () -> action.run());
    }

    /**
     * Executes {@code action} wrapped in an Allure step named {@code name} and returns its
     * result.
     *
     * @param name   the step name shown in the report
     * @param action the action to execute
     * @param <T>    the type of value returned by {@code action}
     * @return the value returned by {@code action}
     */
    public static <T> T step(String name, Supplier<T> action) {
        return Allure.step(name, () -> action.get());
    }

    /**
     * Attaches a named parameter to the current Allure test result.
     *
     * @param name  the parameter name
     * @param value the parameter value
     */
    public static void parameter(String name, String value) {
        Allure.parameter(name, value);
    }

    /**
     * Attaches raw screenshot bytes to the Allure report.
     *
     * @param name       the attachment name shown in the report
     * @param screenshot the PNG screenshot bytes
     */
    public static void attachScreenshot(String name, byte[] screenshot) {
        Allure.addAttachment(name, new ByteArrayInputStream(screenshot));
    }
}
