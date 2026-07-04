package com.vibely.backend.user.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePrivacySettingsRequest(
    @NotNull(message = "Vui lòng chọn trạng thái tài khoản riêng tư")
    Boolean privateAccount
) {
}
