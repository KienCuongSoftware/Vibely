package com.vibely.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class NativeOAuthService {

    private final AuthService authService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String googleClientId;
    private final String facebookAppId;
    private final String facebookAppSecret;

    public NativeOAuthService(
        AuthService authService,
        ObjectMapper objectMapper,
        @Value("${spring.security.oauth2.client.registration.google.client-id:}") String googleClientId,
        @Value("${spring.security.oauth2.client.registration.facebook.client-id:}") String facebookAppId,
        @Value("${spring.security.oauth2.client.registration.facebook.client-secret:}") String facebookAppSecret
    ) {
        this.authService = authService;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.facebookAppId = facebookAppId == null ? "" : facebookAppId.trim();
        this.facebookAppSecret = facebookAppSecret == null ? "" : facebookAppSecret.trim();
    }

    public AuthResponse authenticate(NativeOAuthRequest request) {
        String provider = request.getProvider() == null ? "" : request.getProvider().trim().toLowerCase();
        return switch (provider) {
            case "google" -> authenticateGoogle(request.getIdToken());
            case "facebook" -> authenticateFacebook(request.getAccessToken());
            default -> throw new BadRequestException("Nhà cung cấp OAuth không được hỗ trợ");
        };
    }

    private AuthResponse authenticateGoogle(String idToken) {
        if (!StringUtils.hasText(idToken)) {
            throw new BadRequestException("Thiếu Google ID token");
        }
        if (!StringUtils.hasText(googleClientId)) {
            throw new BadRequestException("Google OAuth chưa được cấu hình trên máy chủ");
        }

        URI uri = UriComponentsBuilder
            .fromUriString("https://oauth2.googleapis.com/tokeninfo")
            .queryParam("id_token", idToken)
            .build(false)
            .encode()
            .toUri();

        JsonNode payload = fetchJson(uri, "Google");
        if (payload == null || payload.has("error")) {
            throw new BadRequestException("Google token không hợp lệ hoặc đã hết hạn");
        }

        String audience = text(payload, "aud");
        if (!googleClientId.equals(audience)) {
            throw new BadRequestException("Google token không khớp ứng dụng Vibely");
        }

        String email = text(payload, "email");
        String name = text(payload, "name");
        String picture = text(payload, "picture");

        return authService.authenticateWithOAuthProvider(email, name, picture, "google");
    }

    private AuthResponse authenticateFacebook(String accessToken) {
        if (!StringUtils.hasText(accessToken)) {
            throw new BadRequestException("Thiếu Facebook access token");
        }
        if (!StringUtils.hasText(facebookAppId) || !StringUtils.hasText(facebookAppSecret)) {
            throw new BadRequestException("Facebook OAuth chưa được cấu hình trên máy chủ");
        }

        URI debugUri = UriComponentsBuilder
            .fromUriString("https://graph.facebook.com/v19.0/debug_token")
            .queryParam("input_token", accessToken)
            .queryParam("access_token", facebookAppId + "|" + facebookAppSecret)
            .build(false)
            .encode()
            .toUri();

        JsonNode debug = fetchJson(debugUri, "Facebook");
        JsonNode error = debug == null ? null : debug.get("error");
        if (error != null && !error.isNull()) {
            String message = text(error, "message");
            if (isFacebookAppCredentialError(message)) {
                throw new BadRequestException(
                    "Facebook App Secret trên máy chủ không đúng. "
                        + "Kiểm tra FACEBOOK_APP_SECRET trong /opt/vibely/config/application-local.yaml"
                );
            }
            throw new BadRequestException(
                message.isBlank() ? "Facebook token không hợp lệ hoặc đã hết hạn" : message
            );
        }
        JsonNode data = debug == null ? null : debug.get("data");
        if (data == null || !data.path("is_valid").asBoolean(false)) {
            JsonNode dataError = data == null ? null : data.get("error");
            String message = dataError == null ? "" : text(dataError, "message");
            throw new BadRequestException(
                message.isBlank() ? "Facebook token không hợp lệ hoặc đã hết hạn" : message
            );
        }
        String appId = data.path("app_id").asText("");
        if (!facebookAppId.equals(appId)) {
            throw new BadRequestException("Facebook token không thuộc ứng dụng Vibely");
        }

        URI profileUri = UriComponentsBuilder
            .fromUriString("https://graph.facebook.com/v19.0/me")
            .queryParam("fields", "id,name,email,picture.type(large)")
            .queryParam("access_token", accessToken)
            .build(false)
            .encode()
            .toUri();

        JsonNode profile = fetchJson(profileUri, "Facebook");
        if (profile == null) {
            throw new BadRequestException("Không lấy được thông tin Facebook");
        }

        String fbId = profile.path("id").asText("");
        String email = text(profile, "email");
        if (!StringUtils.hasText(email)) {
            email = "fb." + fbId + "@oauth.facebook.vibely";
        }
        String name = text(profile, "name");
        String picture = profile.path("picture").path("data").path("url").asText("");

        return authService.authenticateWithOAuthProvider(email, name, picture, "facebook");
    }

    private JsonNode fetchJson(URI uri, String providerLabel) {
        try {
            return restClient.get()
                .uri(uri)
                .exchange((request, response) -> {
                    try (InputStream body = response.getBody()) {
                        if (body == null) {
                            throw new BadRequestException(
                                "Không xác minh được token " + providerLabel
                            );
                        }
                        try {
                            return objectMapper.readTree(body);
                        } catch (IOException parseEx) {
                            throw new BadRequestException(
                                "Không xác minh được token " + providerLabel
                            );
                        }
                    } catch (IOException ex) {
                        throw new BadRequestException(
                            "Không kết nối được tới " + providerLabel + ". Kiểm tra mạng máy chủ."
                        );
                    }
                });
        } catch (BadRequestException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new BadRequestException("Không xác minh được token " + providerLabel);
        } catch (RuntimeException ex) {
            if (ex.getCause() instanceof BadRequestException badRequest) {
                throw badRequest;
            }
            throw new BadRequestException("Không xác minh được token " + providerLabel);
        }
    }

    private static boolean isFacebookAppCredentialError(String message) {
        if (!StringUtils.hasText(message)) {
            return false;
        }
        String lower = message.toLowerCase();
        return lower.contains("app access token")
            || lower.contains("invalid oauth access token signature")
            || lower.contains("error validating application");
    }

    private static String text(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return "";
        }
        return node.get(field).asText("").trim();
    }
}
