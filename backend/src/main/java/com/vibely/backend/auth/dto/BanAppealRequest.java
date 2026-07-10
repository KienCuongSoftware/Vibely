package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BanAppealRequest(
    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không hợp lệ")
    String email,

    @NotBlank(message = "Mô tả là bắt buộc")
    @Size(min = 5, max = 200, message = "Mô tả phải từ 5 đến 200 ký tự")
    String description,

    @Size(max = 500, message = "Lý do cấm tối đa 500 ký tự")
    String banReason,

    @Size(max = 120, message = "Email tài khoản tối đa 120 ký tự")
    String maskedAccountEmail
) {
}
