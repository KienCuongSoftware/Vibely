package com.vibely.backend.common;

import java.time.LocalDateTime;

public record ApiError(LocalDateTime timestamp, int status, String code, String message) {
    public static ApiError of(int status, String code, String message) {
        return new ApiError(LocalDateTime.now(), status, code, message);
    }
}
