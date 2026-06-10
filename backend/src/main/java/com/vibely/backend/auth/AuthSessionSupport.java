package com.vibely.backend.auth;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.security.AuthCookieService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;

final class AuthSessionSupport {

    private AuthSessionSupport() {
    }

    static ResponseEntity<ApiResponse<AuthSessionResponse>> ok(
        AuthResponse auth,
        HttpServletResponse response,
        AuthCookieService authCookieService,
        boolean exposeTokensInApi
    ) {
        authCookieService.writeSessionCookies(response, auth.accessToken(), auth.refreshToken());
        return ResponseEntity.ok(
            ApiResponse.success(AuthSessionResponse.from(auth, exposeTokensInApi))
        );
    }
}
