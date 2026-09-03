package com.vibely.backend.config;

import com.vibely.backend.security.InternalTokenSecurity;
import com.vibely.backend.security.JwtKeyMaterial;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Fail fast on insecure production configuration (weak JWT secret, OTP leak, open metrics,
 * default internal worker tokens).
 */
@Component
public class SecurityStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(SecurityStartupValidator.class);

    private final Environment environment;
    private final String jwtSecret;
    private final boolean exposeOtpInApi;
    private final Map<String, String> internalTokens;

    public SecurityStartupValidator(
        Environment environment,
        @Value("${app.jwt.secret:}") String jwtSecret,
        @Value("${app.mail.expose-code-in-api:false}") boolean exposeOtpInApi,
        @Value("${app.originality.internal-token:}") String originalityToken,
        @Value("${app.moderation.internal-token:}") String moderationToken,
        @Value("${app.content-understanding.internal-token:}") String contentUnderstandingToken,
        @Value("${app.enhancement.internal-token:}") String enhancementToken,
        @Value("${app.translation.internal-token:}") String translationToken
    ) {
        this.environment = environment;
        this.jwtSecret = jwtSecret == null ? "" : jwtSecret.trim();
        this.exposeOtpInApi = exposeOtpInApi;
        Map<String, String> tokens = new LinkedHashMap<>();
        tokens.put("app.originality.internal-token", originalityToken);
        tokens.put("app.moderation.internal-token", moderationToken);
        tokens.put("app.content-understanding.internal-token", contentUnderstandingToken);
        tokens.put("app.enhancement.internal-token", enhancementToken);
        tokens.put("app.translation.internal-token", translationToken);
        this.internalTokens = Map.copyOf(tokens);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validate() {
        if (isProdProfile()) {
            validateProdJwtSecret();
            validateProdInternalTokens();
            if (exposeOtpInApi) {
                throw new IllegalStateException(
                    "app.mail.expose-code-in-api must be false in production"
                );
            }
            return;
        }

        if (isDevProfile() && isWeakJwtSecret(jwtSecret)) {
            log.warn(
                "JWT secret is using the default dev placeholder — set JWT_SECRET before deploying"
            );
        }
        for (Map.Entry<String, String> entry : internalTokens.entrySet()) {
            if (InternalTokenSecurity.isWeakDefault(entry.getValue())) {
                log.warn(
                    "{} is using a weak/default value — set a strong secret before exposing this host",
                    entry.getKey()
                );
            }
        }
    }

    private void validateProdJwtSecret() {
        if (isWeakJwtSecret(jwtSecret)) {
            throw new IllegalStateException(
                "JWT_SECRET must be set to a strong value (>= 32 bytes) in production"
            );
        }
        if (JwtKeyMaterial.resolveBytes(jwtSecret).length < 32) {
            throw new IllegalStateException(
                "JWT_SECRET must provide at least 32 bytes of key material in production"
            );
        }
    }

    private void validateProdInternalTokens() {
        for (Map.Entry<String, String> entry : internalTokens.entrySet()) {
            if (InternalTokenSecurity.isWeakDefault(entry.getValue())) {
                throw new IllegalStateException(
                    entry.getKey()
                        + " must be set to a strong unique value (>= 24 chars) in production"
                );
            }
        }
    }

    static boolean isWeakJwtSecret(String secret) {
        return JwtKeyMaterial.isWeak(secret);
    }

    private boolean isProdProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    private boolean isDevProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }
}
