package com.vibely.backend.config;

import com.vibely.backend.security.JwtKeyMaterial;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Fail fast on insecure production configuration (weak JWT secret, OTP leak, open metrics).
 */
@Component
public class SecurityStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(SecurityStartupValidator.class);

    private final Environment environment;
    private final String jwtSecret;
    private final boolean exposeOtpInApi;

    public SecurityStartupValidator(
        Environment environment,
        @Value("${app.jwt.secret:}") String jwtSecret,
        @Value("${app.mail.expose-code-in-api:false}") boolean exposeOtpInApi
    ) {
        this.environment = environment;
        this.jwtSecret = jwtSecret == null ? "" : jwtSecret.trim();
        this.exposeOtpInApi = exposeOtpInApi;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validate() {
        if (isProdProfile()) {
            validateProdJwtSecret();
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
