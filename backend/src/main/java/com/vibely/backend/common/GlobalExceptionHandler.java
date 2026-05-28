package com.vibely.backend.common;

import com.vibely.backend.antibot.dto.CaptchaRequiredPayload;
import com.vibely.backend.antibot.exception.CaptchaRequiredException;
import com.vibely.backend.antibot.exception.SuspiciousLoginException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.failure(ApiError.of(HttpStatus.NOT_FOUND.value(), "NOT_FOUND", ex.getMessage())));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.failure(ApiError.of(HttpStatus.BAD_REQUEST.value(), "BAD_REQUEST", ex.getMessage())));
    }

    @ExceptionHandler(CaptchaRequiredException.class)
    public ResponseEntity<ApiResponse<CaptchaRequiredPayload>> handleCaptchaRequired(CaptchaRequiredException ex) {
        CaptchaRequiredPayload payload = new CaptchaRequiredPayload(ex.getChallengeLevel(), ex.getRiskScore());
        return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
            .body(new ApiResponse<>(
                false,
                payload,
                ApiError.of(
                    HttpStatus.PRECONDITION_REQUIRED.value(),
                    "CAPTCHA_REQUIRED",
                    "Yêu cầu xác minh captcha trước khi tiếp tục"
                )
            ));
    }

    @ExceptionHandler(SuspiciousLoginException.class)
    public ResponseEntity<ApiResponse<Void>> handleSuspiciousLogin(SuspiciousLoginException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(ApiResponse.failure(ApiError.of(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "SUSPICIOUS_LOGIN",
                ex.getMessage()
            )));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(FieldError::getDefaultMessage)
            .orElse("Dữ liệu không hợp lệ");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.failure(ApiError.of(HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR", message)));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
            .findFirst()
            .map(violation -> violation.getMessage())
            .orElse("Dữ liệu không hợp lệ");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.failure(ApiError.of(HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR", message)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.failure(ApiError.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "Lỗi hệ thống, vui lòng thử lại sau"
            )));
    }
}
