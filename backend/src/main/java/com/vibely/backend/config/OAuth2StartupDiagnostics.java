package com.vibely.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Component;

@Component
@Order(0)
public class OAuth2StartupDiagnostics implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OAuth2StartupDiagnostics.class);

    private final boolean oauth2Enabled;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrations;

    public OAuth2StartupDiagnostics(
        @Value("${app.oauth2.enabled:true}") boolean oauth2Enabled,
        ObjectProvider<ClientRegistrationRepository> clientRegistrations
    ) {
        this.oauth2Enabled = oauth2Enabled;
        this.clientRegistrations = clientRegistrations;
    }

    @Override
    public void run(ApplicationArguments args) {
        ClientRegistrationRepository repo = clientRegistrations.getIfAvailable();
        if (!oauth2Enabled) {
            log.warn(
                "OAuth2 browser login DISABLED (app.oauth2.enabled=false). "
                    + "/api/oauth2/authorization/* will return OAUTH_DISABLED."
            );
            return;
        }
        if (repo == null) {
            log.error(
                "OAuth2 enabled but ClientRegistrationRepository is missing — "
                    + "social login will not redirect. Check Google/Facebook/LINE client credentials."
            );
            return;
        }
        boolean google = repo.findByRegistrationId("google") != null;
        boolean facebook = repo.findByRegistrationId("facebook") != null;
        boolean line = repo.findByRegistrationId("line") != null;
        log.info(
            "OAuth2 browser login ENABLED (google={}, facebook={}, line={})",
            google,
            facebook,
            line
        );
    }
}
