package com.vibely.backend.user.dto;

public record PrivacySettingsResponse(
    boolean privateAccount,
    String commentAudience,
    String dmPotentialAudience,
    String dmOthersAudience
) {
}
