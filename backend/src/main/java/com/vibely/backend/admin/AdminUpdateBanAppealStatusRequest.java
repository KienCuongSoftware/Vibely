package com.vibely.backend.admin;

import com.vibely.backend.auth.entity.BanAppealStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminUpdateBanAppealStatusRequest(
    @NotNull(message = "Status is required")
    BanAppealStatus status,

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    String adminNotes
) {
}
