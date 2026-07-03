package com.vibely.backend.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Auth payload returned to clients — tokens only in httpOnly cookies (unless test expose flag). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthSessionResponse(
    Long userId,
    String username,
    String displayName,
    String email,
    String role,
    String avatarUrl,
    boolean needsOnboarding,
    String accessToken,
    String refreshToken
) {
    public static AuthSessionResponse from(AuthResponse auth, boolean exposeTokensInApi) {
        return new AuthSessionResponse(
            auth.userId(),
            auth.username(),
            auth.displayName(),
            auth.email(),
            auth.role(),
            auth.avatarUrl(),
            auth.needsOnboarding(),
            exposeTokensInApi ? auth.accessToken() : null,
            exposeTokensInApi ? auth.refreshToken() : null
        );
    }
}
