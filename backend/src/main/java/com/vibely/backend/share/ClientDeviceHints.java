package com.vibely.backend.share;

public record ClientDeviceHints(
    String deviceClass,
    String browserFamily,
    String osFamily,
    boolean bot
) {}
