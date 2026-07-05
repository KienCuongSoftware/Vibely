package com.vibely.backend.auth.oauth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginFailureHandler.class);
    private final String frontendFailureUrl;
    private final String oauthPublicBaseUrl;
    private final String frontendBaseUrl;

    public OAuth2LoginFailureHandler(
        @Value("${app.oauth2.frontend-failure-url:http://localhost:5173/login}") String frontendFailureUrl,
        @Value("${app.oauth2.public-base-url:}") String oauthPublicBaseUrl,
        @Value("${app.urls.frontend-base-url:http://localhost:5173}") String frontendBaseUrl
    ) {
        this.frontendFailureUrl = frontendFailureUrl;
        this.oauthPublicBaseUrl = oauthPublicBaseUrl == null ? "" : oauthPublicBaseUrl.trim();
        this.frontendBaseUrl = frontendBaseUrl == null ? "" : frontendBaseUrl.trim();
    }

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    ) throws IOException, ServletException {
        log.warn(
            "OAuth2 login failed for {}: {}",
            request.getRequestURI(),
            exception.getMessage(),
            exception
        );

        UriComponentsBuilder redirect = UriComponentsBuilder.fromUriString(
            OAuthRedirectUrlSupport.resolveFrontendLoginUrl(
                request,
                frontendFailureUrl,
                oauthPublicBaseUrl,
                frontendBaseUrl
            )
        )
            .queryParam("oauth", "error");
        String reason = resolveFailureReason(exception);
        if (reason != null) {
            redirect.queryParam("reason", reason);
        }
        String redirectUrl = redirect.encode(StandardCharsets.UTF_8).build().toUriString();
        response.sendRedirect(redirectUrl);
    }

    /**
     * Short machine-readable codes only — LoginPage maps these to Vietnamese copy.
     */
    private static String resolveFailureReason(AuthenticationException exception) {
        String message = exception.getMessage();
        if (message == null) {
            return null;
        }
        String lower = message.toLowerCase();
        if (message.contains("invalid_id_token") && message.contains("iat=")) {
            return "clock_skew";
        }
        if (lower.contains("redirect_uri") || lower.contains("redirect uri")) {
            return "redirect_mismatch";
        }
        if (lower.contains("authorization_request_not_found")) {
            return "session_lost";
        }
        if (lower.contains("invalid_grant")) {
            return "invalid_grant";
        }
        if (lower.contains("invalid_token_response") || lower.contains("invalid_client")) {
            return "invalid_client";
        }
        return null;
    }
}
