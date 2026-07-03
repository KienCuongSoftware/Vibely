package com.vibely.backend.auth.oauth;

import com.vibely.backend.auth.dto.AuthResponse;
import com.vibely.backend.auth.exception.AccountDeactivatedException;
import com.vibely.backend.auth.service.AuthService;
import com.vibely.backend.auth.store.AccountReactivationTokenStore;
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
    private final AccountReactivationTokenStore reactivationTokenStore;
    private final String frontendSuccessUrl;
    private final String oauthPublicBaseUrl;

    public OAuth2LoginSuccessHandler(
        @Lazy AuthService authService,
        OAuthLoginCodeStore oAuthLoginCodeStore,
        AccountReactivationTokenStore reactivationTokenStore,
        @Value("${app.oauth2.frontend-success-url:http://localhost:5173/login}") String frontendSuccessUrl,
        @Value("${app.oauth2.public-base-url:}") String oauthPublicBaseUrl
    ) {
        this.authService = authService;
        this.oAuthLoginCodeStore = oAuthLoginCodeStore;
        this.reactivationTokenStore = reactivationTokenStore;
        this.frontendSuccessUrl = frontendSuccessUrl;
        this.oauthPublicBaseUrl = oauthPublicBaseUrl == null ? "" : oauthPublicBaseUrl.trim();
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

        String email = resolveOAuthEmail(registrationId, attributes);
        String name = resolveOAuthDisplayName(registrationId, attributes);
        String picture = extractProfilePictureUrl(attributes);

        AuthResponse authResponse;
        try {
            authResponse = authService.authenticateWithOAuthProvider(email, name, picture, registrationId);
        } catch (AccountDeactivatedException ex) {
            String reactivationToken = reactivationTokenStore.createToken(ex.getEmail());
            String loginBase = OAuthRedirectUrlSupport.resolveFrontendLoginUrl(
                request,
                frontendSuccessUrl,
                oauthPublicBaseUrl
            );
            String redirectUrl = UriComponentsBuilder.fromUriString(loginBase)
                .queryParam("reactivate", "1")
                .queryParam("token", reactivationToken)
                .queryParam("maskedEmail", maskEmail(ex.getEmail()))
                .queryParam("provider", registrationId)
                .build()
                .encode()
                .toUriString();
            response.sendRedirect(redirectUrl);
            return;
        }
        String oneTimeCode = oAuthLoginCodeStore.createCode(authResponse);
        String loginBase = OAuthRedirectUrlSupport.resolveFrontendLoginUrl(
            request,
            frontendSuccessUrl,
            oauthPublicBaseUrl
        );
        String redirectUrl = UriComponentsBuilder.fromUriString(loginBase)
            .queryParam("oauth", "success")
            .queryParam("code", oneTimeCode)
            .queryParam("provider", registrationId)
            .build(true)
            .toUriString();

        response.sendRedirect(redirectUrl);
    }

    private String resolveOAuthEmail(String registrationId, Map<String, Object> attributes) {
        if ("facebook".equalsIgnoreCase(registrationId)) {
            String fbId = stringValue(attributes.get("id"));
            if (fbId.isBlank()) {
                throw new BadRequestException("Đăng nhập Facebook thiếu id người dùng, vui lòng thử lại");
            }
            String graphEmail = stringValue(attributes.get("email"));
            return graphEmail.isBlank() ? "fb." + fbId + "@oauth.facebook.vibely" : graphEmail.trim();
        }
        if ("line".equalsIgnoreCase(registrationId)) {
            String lineEmail = stringValue(attributes.get("email"));
            if (!lineEmail.isBlank()) {
                return lineEmail.trim();
            }
            String sub = stringValue(attributes.get("sub"));
            if (sub.isBlank()) {
                sub = stringValue(attributes.get("userId"));
            }
            if (sub.isBlank()) {
                throw new BadRequestException("Đăng nhập LINE thiếu id người dùng, vui lòng thử lại");
            }
            return "line." + sub + "@oauth.line.vibely";
        }
        return stringValue(attributes.get("email"));
    }

    private String resolveOAuthDisplayName(String registrationId, Map<String, Object> attributes) {
        String name = stringValue(attributes.get("name"));
        if (!name.isBlank()) {
            return name;
        }
        if ("line".equalsIgnoreCase(registrationId)) {
            return stringValue(attributes.get("displayName"));
        }
        return name;
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
        picture = stringValue(attributes.get("pictureUrl"));
        if (!picture.isBlank()) {
            return picture;
        }
        return stringValue(attributes.get("profilePhotoUrl"));
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
