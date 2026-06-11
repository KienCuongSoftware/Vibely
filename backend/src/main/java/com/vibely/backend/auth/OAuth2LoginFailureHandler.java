package com.vibely.backend.auth;

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

    public OAuth2LoginFailureHandler(
        @Value("${app.oauth2.frontend-failure-url:http://localhost:5173/login}") String frontendFailureUrl
    ) {
        this.frontendFailureUrl = frontendFailureUrl;
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

        UriComponentsBuilder redirect = UriComponentsBuilder.fromUriString(frontendFailureUrl)
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
        if (message.contains("invalid_id_token") && message.contains("iat=")) {
            return "clock_skew";
        }
        return null;
    }
}
