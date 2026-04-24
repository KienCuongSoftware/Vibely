package com.vibely.backend.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final OAuthLoginCodeStore oAuthLoginCodeStore;
    private final String frontendSuccessUrl;

    public OAuth2LoginSuccessHandler(
        @Lazy AuthService authService,
        OAuthLoginCodeStore oAuthLoginCodeStore,
        @Value("${app.oauth2.frontend-success-url:http://localhost:5173/login}") String frontendSuccessUrl
    ) {
        this.authService = authService;
        this.oAuthLoginCodeStore = oAuthLoginCodeStore;
        this.frontendSuccessUrl = frontendSuccessUrl;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oauthUser.getAttributes();

        String email = stringValue(attributes.get("email"));
        String name = stringValue(attributes.get("name"));
        String picture = stringValue(attributes.get("picture"));

        AuthResponse authResponse = authService.authenticateWithGoogle(email, name, picture);
        String oneTimeCode = oAuthLoginCodeStore.createCode(authResponse);
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendSuccessUrl)
            .queryParam("oauth", "success")
            .queryParam("code", oneTimeCode)
            .build(true)
            .toUriString();

        response.sendRedirect(redirectUrl);
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
