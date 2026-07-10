package com.vibely.backend.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminBanUserRequest(
    @NotBlank(message = "Lý do cấm tài khoản là bắt buộc")
    @Size(min = 5, max = 500, message = "Lý do cấm phải từ 5 đến 500 ký tự")
    String reason
) {
}
