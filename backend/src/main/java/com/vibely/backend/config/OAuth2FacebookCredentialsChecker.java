package com.vibely.backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Rejects mistaken env values such as the literal {@code ${FACEBOOK_CLIENT_ID}}, which Meta surfaces as "Invalid App ID".
 */
@Component
@Profile("dev")
public class OAuth2FacebookCredentialsChecker implements ApplicationRunner {

    private final Environment environment;

    public OAuth2FacebookCredentialsChecker(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        String clientId =
            environment.getProperty("spring.security.oauth2.client.registration.facebook.client-id");
        String clientSecret =
            environment.getProperty("spring.security.oauth2.client.registration.facebook.client-secret");
        if (clientId == null && clientSecret == null) {
            return;
        }
        if (looksLikeUnresolvedPlaceholder(clientId) || looksLikeUnresolvedPlaceholder(clientSecret)) {
            throw new IllegalStateException(
                "Facebook OAuth credentials look invalid (placeholder text reached Meta). "
                    + "Set numeric FACEBOOK_CLIENT_ID or FACEBOOK_APP_ID and FACEBOOK_CLIENT_SECRET or FACEBOOK_APP_SECRET "
                    + "in the shell before starting the backend — do not paste the literal ${...} text. "
                    + "Example (PowerShell): $env:FACEBOOK_CLIENT_ID=\"YOUR_META_APP_ID\""
            );
        }
    }

    private static boolean looksLikeUnresolvedPlaceholder(String value) {
        return value != null && value.contains("${");
    }
}
