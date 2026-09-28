package com.vibely.backend.live.exception;

import com.vibely.backend.common.ApiError;
import com.vibely.backend.common.ApiResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps LIVE domain errors onto the shared ApiResponse envelope; everything else falls through to GlobalExceptionHandler. */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LiveExceptionHandler {

    @ExceptionHandler(LiveException.class)
    public ResponseEntity<ApiResponse<Void>> handleLive(LiveException ex) {
        LiveErrorCode code = ex.getCode();
        return ResponseEntity.status(code.status())
            .body(ApiResponse.failure(ApiError.of(code.status().value(), code.name(), ex.getMessage())));
    }
}
