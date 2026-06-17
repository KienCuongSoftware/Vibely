package com.vibely.backend.auth;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.security.AuthCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;

final class AuthSessionSupport {

    static final String MOBILE_CLIENT_HEADER = "X-Vibely-Client";

    private AuthSessionSupport() {
    }

    static ResponseEntity<ApiResponse<AuthSessionResponse>> ok(
        AuthResponse auth,
        HttpServletRequest request,
        HttpServletResponse response,
        AuthCookieService authCookieService,
        boolean exposeTokensInApi
    ) {
        boolean expose = exposeTokensInApi || isMobileApiClient(request);
        authCookieService.writeSessionCookies(response, auth.accessToken(), auth.refreshToken());
        return ResponseEntity.ok(
            ApiResponse.success(AuthSessionResponse.from(auth, expose))
        );
    }

    static boolean isMobileApiClient(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        String client = request.getHeader(MOBILE_CLIENT_HEADER);
        if (client != null && "mobile".equalsIgnoreCase(client.trim())) {
            return true;
        }
        String userAgent = request.getHeader("User-Agent");
        return userAgent != null && userAgent.contains("VibelyMobile");
    }
}
