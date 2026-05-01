package com.vibely.backend.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank(message = "Vui lòng nhập Vibely ID")
    @Size(min = 4, max = 24, message = "Vibely ID cần từ 4-24 ký tự")
    String username,
    @NotBlank(message = "Vui lòng nhập tên hiển thị")
    @Size(max = 80, message = "Tên hiển thị tối đa 80 ký tự")
    String displayName,
    @Size(max = 300, message = "Tiểu sử tối đa 300 ký tự")
    String bio,
    @Size(max = 512, message = "URL ảnh đại diện tối đa 512 ký tự")
    String avatarUrl
) {
}
