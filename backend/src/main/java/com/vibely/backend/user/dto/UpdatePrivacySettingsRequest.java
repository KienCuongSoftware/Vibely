package com.vibely.backend.user.dto;

public record UpdatePrivacySettingsRequest(
    Boolean privateAccount,
    String commentAudience
) {
}
