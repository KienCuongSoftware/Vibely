package com.vibely.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
public class OAuth2PublicBaseUrlLogger implements ApplicationRunner {

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final String publicBaseUrl;

    OAuth2PublicBaseUrlLogger(
        ClientRegistrationRepository clientRegistrationRepository,
        @Value("${app.oauth2.public-base-url:}") String publicBaseUrl
    ) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.publicBaseUrl = publicBaseUrl == null ? "" : publicBaseUrl.trim();
    }

    @Override
    public void run(ApplicationArguments args) {
        ClientRegistration google = clientRegistrationRepository.findByRegistrationId("google");
        ClientRegistration line = clientRegistrationRepository.findByRegistrationId("line");
        String googleRedirect = google != null ? google.getRedirectUri() : "(missing)";
        String lineRedirect = line != null ? line.getRedirectUri() : "(missing)";
        if (!publicBaseUrl.isBlank()) {
            org.slf4j.LoggerFactory.getLogger(OAuth2PublicBaseUrlLogger.class)
                .info(
                    "OAuth2 public-base-url={} | google redirect-uri={} | line redirect-uri={}",
                    publicBaseUrl,
                    googleRedirect,
                    lineRedirect
                );
            return;
        }
        org.slf4j.LoggerFactory.getLogger(OAuth2PublicBaseUrlLogger.class)
            .warn(
                "OAuth2 public-base-url chua cau hinh | google redirect-uri={} — tunnel/dien thoai can dat trong application-local.yaml",
                googleRedirect
            );
    }
}
