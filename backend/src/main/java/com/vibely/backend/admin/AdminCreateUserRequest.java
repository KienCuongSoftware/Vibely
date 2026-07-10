package com.vibely.backend.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AdminCreateUserRequest(
    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không hợp lệ")
    String email,

    @NotBlank(message = "Vibely ID là bắt buộc")
    String username,

    @NotBlank(message = "Tên hiển thị là bắt buộc")
    @Size(max = 80, message = "Tên hiển thị tối đa 80 ký tự")
    String displayName,

    @NotBlank(message = "Vai trò là bắt buộc")
    String role,

    @NotBlank(message = "Mật khẩu là bắt buộc")
    @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6 đến 100 ký tự")
    String password,

    @NotNull(message = "Ngày sinh là bắt buộc")
    LocalDate birthDate
) {
}
