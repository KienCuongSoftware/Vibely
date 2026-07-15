package com.vibely.backend.common;

import com.vibely.backend.antibot.dto.CaptchaRequiredPayload;
import com.vibely.backend.antibot.exception.CaptchaRequiredException;
import com.vibely.backend.antibot.exception.SuspiciousLoginException;
import com.vibely.backend.auth.exception.AccountBannedException;
import com.vibely.backend.auth.exception.AccountDeactivatedException;
import com.vibely.backend.auth.dto.AccountBannedPayload;
import com.vibely.backend.auth.dto.AccountDeactivatedPayload;
import com.vibely.backend.auth.store.AccountReactivationTokenStore;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final AccountReactivationTokenStore reactivationTokenStore;

    public GlobalExceptionHandler(AccountReactivationTokenStore reactivationTokenStore) {
        this.reactivationTokenStore = reactivationTokenStore;
    }

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

    @ExceptionHandler(AccountBannedException.class)
    public ResponseEntity<ApiResponse<AccountBannedPayload>> handleAccountBanned(
        AccountBannedException ex
    ) {
        String reason = com.vibely.backend.moderation.BanReasonFormatter.forDisplay(ex.getReason());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ApiResponse<>(
                false,
                new AccountBannedPayload(ex.getEmail(), maskEmail(ex.getEmail()), reason),
                ApiError.of(HttpStatus.FORBIDDEN.value(), "ACCOUNT_BANNED", ex.getMessage())
            ));
    }

    @ExceptionHandler(AccountDeactivatedException.class)
    public ResponseEntity<ApiResponse<AccountDeactivatedPayload>> handleAccountDeactivated(
        AccountDeactivatedException ex
    ) {
        String token = reactivationTokenStore.createToken(ex.getEmail());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ApiResponse<>(
                false,
                new AccountDeactivatedPayload(token, maskEmail(ex.getEmail())),
                ApiError.of(HttpStatus.CONFLICT.value(), "ACCOUNT_DEACTIVATED", ex.getMessage())
            ));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.failure(ApiError.of(
                HttpStatus.UNAUTHORIZED.value(),
                "AUTH_REQUIRED",
                ex.getMessage()
            )));
    }

    @ExceptionHandler(StorageDeletionException.class)
    public ResponseEntity<ApiResponse<Void>> handleStorageDeletion(StorageDeletionException ex) {
        log.warn("S3 deletion failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ApiResponse.failure(ApiError.of(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "STORAGE_DELETION_FAILED",
                ex.getMessage() != null && !ex.getMessage().isBlank()
                    ? ex.getMessage()
                    : "Không thể xóa file trên kho lưu trữ. Vui lòng thử lại sau."
            )));
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

    @ExceptionHandler({ AccessDeniedException.class, AuthorizationDeniedException.class })
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(Exception ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.failure(ApiError.of(
                HttpStatus.FORBIDDEN.value(),
                "ACCESS_DENIED",
                "Bạn không có quyền thực hiện thao tác này"
            )));
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

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "";
        }
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.isEmpty()) {
            return "***" + domain;
        }
        if (local.length() == 1) {
            return "*" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}
