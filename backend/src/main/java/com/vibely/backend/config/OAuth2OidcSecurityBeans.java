package com.vibely.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenDecoderFactory;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.jose.jws.JwsAlgorithm;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoderFactory;

/**
 * LINE web login signs id_token with HS256 (channel secret); native/LIFF uses ES256.
 * Google/Facebook OIDC use RS256. Spring defaults to RS256 for all clients.
 *
 * @see <a href="https://developers.line.biz/en/docs/line-login/verify-id-token/">LINE verify id token</a>
 */
@Configuration
@ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
public class OAuth2OidcSecurityBeans {

    @Bean
    @Primary
    JwtDecoderFactory<ClientRegistration> idTokenDecoderFactory() {
        OidcIdTokenDecoderFactory factory = new OidcIdTokenDecoderFactory();
        factory.setJwsAlgorithmResolver(OAuth2OidcSecurityBeans::resolveJwsAlgorithm);
        return factory;
    }

    static JwsAlgorithm resolveJwsAlgorithm(ClientRegistration registration) {
        if ("line".equals(registration.getRegistrationId())) {
            return MacAlgorithm.HS256;
        }
        return SignatureAlgorithm.RS256;
    }
}
