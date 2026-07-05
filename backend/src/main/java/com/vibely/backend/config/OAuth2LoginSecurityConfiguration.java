package com.vibely.backend.config;

import com.vibely.backend.auth.oauth.ApiOAuth2AuthorizationRequestRedirectFilter;
import com.vibely.backend.auth.oauth.OAuth2LoginFailureHandler;
import com.vibely.backend.auth.oauth.OAuth2LoginSuccessHandler;
import com.vibely.backend.auth.oauth.OAuth2WebPaths;
import com.vibely.backend.auth.oauth.PublicBaseUrlOAuth2AuthorizationRequestResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2LoginAuthenticationProvider;
import org.springframework.security.oauth2.client.endpoint.DefaultAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.oidc.authentication.OidcAuthorizationCodeAuthenticationProvider;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter;
import org.springframework.security.oauth2.jwt.JwtDecoderFactory;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Dedicated OAuth2 filter chain with a single OIDC provider (HS256 id_token for LINE web login).
 * Avoids {@code oauth2Login()} registering a second {@link OidcAuthorizationCodeAuthenticationProvider},
 * which caused {@code invalid_grant} from exchanging the authorization code twice.
 */
@Configuration
@ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
public class OAuth2LoginSecurityConfiguration {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    SecurityFilterChain oauth2SecurityFilterChain(
        HttpSecurity http,
        ClientRegistrationRepository clientRegistrationRepository,
        OAuth2AuthorizedClientService authorizedClientService,
        JwtDecoderFactory<ClientRegistration> idTokenDecoderFactory,
        OAuth2LoginSuccessHandler successHandler,
        OAuth2LoginFailureHandler failureHandler,
        CorsConfigurationSource corsConfigurationSource,
        @Value("${app.oauth2.public-base-url:}") String oauthPublicBaseUrl
    ) throws Exception {
        OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> tokenClient =
            new DefaultAuthorizationCodeTokenResponseClient();

        OidcAuthorizationCodeAuthenticationProvider oidcProvider =
            new OidcAuthorizationCodeAuthenticationProvider(tokenClient, new OidcUserService());
        oidcProvider.setJwtDecoderFactory(idTokenDecoderFactory);

        OAuth2LoginAuthenticationProvider oauth2LoginProvider =
            new OAuth2LoginAuthenticationProvider(tokenClient, new DefaultOAuth2UserService());

        // OIDC first (LINE/Google): avoids exchanging the auth code twice when OIDC validation fails after OAuth2Login succeeds.
        ProviderManager oauthAuthenticationManager =
            new ProviderManager(oidcProvider, oauth2LoginProvider);

        OAuth2AuthorizationRequestResolver authorizationRequestResolver =
            new PublicBaseUrlOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                OAuth2WebPaths.AUTHORIZATION_BASE_URI,
                oauthPublicBaseUrl
            );

        ApiOAuth2AuthorizationRequestRedirectFilter authorizationRedirectFilter =
            new ApiOAuth2AuthorizationRequestRedirectFilter(
                authorizationRequestResolver,
                OAuth2WebPaths.AUTHORIZATION_BASE_URI
            );

        OAuth2LoginAuthenticationFilter loginFilter =
            new OAuth2LoginAuthenticationFilter(clientRegistrationRepository, authorizedClientService);
        loginFilter.setFilterProcessesUrl(OAuth2WebPaths.LOGIN_PROCESSING_URI);
        loginFilter.setAuthenticationManager(oauthAuthenticationManager);
        loginFilter.setAuthenticationSuccessHandler(successHandler);
        loginFilter.setAuthenticationFailureHandler(failureHandler);

        http
            .securityMatcher("/api/oauth2/**", "/api/login/oauth2/**")
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .addFilterBefore(authorizationRedirectFilter, OAuth2LoginAuthenticationFilter.class)
            .addFilter(loginFilter);

        return http.build();
    }
}
