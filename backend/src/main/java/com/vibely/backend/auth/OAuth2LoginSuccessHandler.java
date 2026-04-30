package com.vibely.backend.auth;

import com.vibely.backend.common.BadRequestException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
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

        String registrationId = authentication instanceof OAuth2AuthenticationToken token
            ? token.getAuthorizedClientRegistrationId()
            : "google";

        String email;
        if ("facebook".equalsIgnoreCase(registrationId)) {
            String fbId = stringValue(attributes.get("id"));
            if (fbId.isBlank()) {
                throw new BadRequestException("Đăng nhập Facebook thiếu id người dùng, vui lòng thử lại");
            }
            String graphEmail = stringValue(attributes.get("email"));
            email = graphEmail.isBlank() ? "fb." + fbId + "@oauth.facebook.vibely" : graphEmail.trim();
        } else {
            email = stringValue(attributes.get("email"));
        }
        String name = stringValue(attributes.get("name"));
        String picture = extractProfilePictureUrl(attributes);

        AuthResponse authResponse =
            authService.authenticateWithOAuthProvider(email, name, picture, registrationId);
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

    /**
     * Facebook returns {@code picture} as {@code { "data": { "url": "..." } }}; Google often returns a string URL.
     */
    private String extractProfilePictureUrl(Map<String, Object> attributes) {
        Object raw = attributes.get("picture");
        if (raw instanceof String s && !s.isBlank()) {
            return s;
        }
        if (raw instanceof Map<?, ?> pictureMap) {
            Object data = pictureMap.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                String url = stringValue(dataMap.get("url"));
                if (!url.isBlank()) {
                    return url;
                }
            }
        }
        String picture = stringValue(raw);
        if (!picture.isBlank() && !picture.startsWith("{")) {
            return picture;
        }
        picture = stringValue(attributes.get("avatar"));
        if (!picture.isBlank()) {
            return picture;
        }
        picture = stringValue(attributes.get("profile_picture"));
        if (!picture.isBlank()) {
            return picture;
        }
        return stringValue(attributes.get("profilePhotoUrl"));
    }
}
