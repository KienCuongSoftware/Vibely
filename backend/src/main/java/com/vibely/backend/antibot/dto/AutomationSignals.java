package com.vibely.backend.antibot.dto;

public record AutomationSignals(
    boolean webdriver,
    boolean headlessHints,
    boolean seleniumGlobals,
    boolean puppeteerTrace,
    boolean playwrightTrace,
    boolean suspiciousWebGl,
    double timingVariance
) {
}
