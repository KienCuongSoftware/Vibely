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

        // Chi truyen oauth=error; LoginPage hien thi message tieng Viet mac dinh (tranh loi encode query).
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendFailureUrl)
            .queryParam("oauth", "error")
            .encode(StandardCharsets.UTF_8)
            .build()
            .toUriString();
        response.sendRedirect(redirectUrl);
    }
}
