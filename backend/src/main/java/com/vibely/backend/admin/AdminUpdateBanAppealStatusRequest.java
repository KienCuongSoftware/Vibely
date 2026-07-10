package com.vibely.backend.admin;

import com.vibely.backend.auth.entity.BanAppealStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminUpdateBanAppealStatusRequest(
    @NotNull(message = "Trạng thái là bắt buộc")
    BanAppealStatus status,

    @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
    String adminNotes
) {
}
