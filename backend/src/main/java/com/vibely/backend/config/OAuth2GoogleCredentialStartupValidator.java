package com.vibely.backend.config;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Dev-only probe: Google returns {@code invalid_grant} for a fake code when credentials are valid,
 * and {@code invalid_client} when client-id/secret are wrong.
 */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
public class OAuth2GoogleCredentialStartupValidator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OAuth2GoogleCredentialStartupValidator.class);

    private final ClientRegistrationRepository clientRegistrationRepository;

    OAuth2GoogleCredentialStartupValidator(ClientRegistrationRepository clientRegistrationRepository) {
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        ClientRegistration google = clientRegistrationRepository.findByRegistrationId("google");
        if (google == null) {
            return;
        }
        String clientId = google.getClientId();
        String clientSecret = google.getClientSecret();
        if (!StringUtils.hasText(clientId) || !StringUtils.hasText(clientSecret)) {
            log.warn(
                "Google OAuth chua cau hinh — dat client-id/client-secret trong application-local.yaml"
            );
            return;
        }

        try {
            String body = "grant_type=authorization_code"
                + "&code=startup-probe"
                + "&redirect_uri=" + URLEncoder.encode(google.getRedirectUri(), StandardCharsets.UTF_8)
                + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(8))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            String responseBody = response.body() == null ? "" : response.body();
            if (responseBody.contains("invalid_client")) {
                log.error(
                    "Google OAuth KHONG HOAT DONG: Client Secret khong hop le (invalid_client). "
                        + "Vao Google Cloud Console -> APIs & Services -> Credentials -> OAuth client (Web) "
                        + "-> Add secret / Reset secret -> cap nhat spring.security.oauth2.client.registration.google.client-secret "
                        + "trong application-local.yaml -> restart backend. "
                        + "Redirect URI can dang ky: {}",
                    google.getRedirectUri()
                );
                return;
            }
            if (responseBody.contains("invalid_grant")) {
                log.info("Google OAuth credentials OK (client-id ...{})", tail(clientId, 12));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.debug("Google OAuth credential probe interrupted");
        } catch (Exception e) {
            log.debug("Google OAuth credential probe skipped: {}", e.getMessage());
        }
    }

    private static String tail(String value, int maxLen) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.length() <= maxLen ? value : value.substring(value.length() - maxLen);
    }
}
