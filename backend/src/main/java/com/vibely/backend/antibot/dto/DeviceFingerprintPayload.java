package com.vibely.backend.antibot.dto;

import java.util.List;

public record DeviceFingerprintPayload(
    String userAgent,
    String platform,
    String language,
    String timezone,
    Integer screenWidth,
    Integer screenHeight,
    Integer colorDepth,
    Integer hardwareConcurrency,
    Double deviceMemory,
    String canvasHash,
    String webglRenderer,
    String audioHash,
    List<String> fonts
) {
}
