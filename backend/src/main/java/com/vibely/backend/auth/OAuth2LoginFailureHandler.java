package com.vibely.backend.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

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
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendFailureUrl)
            .queryParam("oauth", "error")
            .queryParam("message", "Đăng nhập bằng tài khoản liên kết thất bại, vui lòng thử lại")
            .build(true)
            .toUriString();
        response.sendRedirect(redirectUrl);
    }
}
