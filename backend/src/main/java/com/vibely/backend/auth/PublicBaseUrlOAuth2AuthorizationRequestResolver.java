package com.vibely.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * OAuth redirect_uri phải khớp Google/Facebook console.
 * Ưu tiên {@code app.oauth2.public-base-url}; không thì dùng host thực (X-Forwarded-* từ tunnel/nginx).
 */
public final class PublicBaseUrlOAuth2AuthorizationRequestResolver
    implements OAuth2AuthorizationRequestResolver {

    private final DefaultOAuth2AuthorizationRequestResolver delegate;
    private final String configuredPublicBaseUrl;

    public PublicBaseUrlOAuth2AuthorizationRequestResolver(
        ClientRegistrationRepository clientRegistrationRepository,
        String authorizationRequestBaseUri,
        String configuredPublicBaseUrl
    ) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(
            clientRegistrationRepository,
            authorizationRequestBaseUri
        );
        this.configuredPublicBaseUrl =
            configuredPublicBaseUrl == null ? "" : configuredPublicBaseUrl.trim();
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return patchRedirectUri(delegate.resolve(request), request, null);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return patchRedirectUri(delegate.resolve(request, clientRegistrationId), request, clientRegistrationId);
    }

    private OAuth2AuthorizationRequest patchRedirectUri(
        OAuth2AuthorizationRequest request,
        HttpServletRequest httpRequest,
        String registrationId
    ) {
        if (request == null || !StringUtils.hasText(registrationId)) {
            return request;
        }
        String publicBase = resolvePublicBaseUrl(httpRequest);
        if (!StringUtils.hasText(publicBase)) {
            return request;
        }
        String redirectUri = publicBase + "/login/oauth2/code/" + registrationId;
        return OAuth2AuthorizationRequest.from(request).redirectUri(redirectUri).build();
    }

    private String resolvePublicBaseUrl(HttpServletRequest request) {
        if (StringUtils.hasText(configuredPublicBaseUrl)) {
            return trimTrailingSlash(configuredPublicBaseUrl);
        }
        try {
            String origin = ServletUriComponentsBuilder.fromRequest(request)
                .replacePath(request.getContextPath())
                .replaceQuery(null)
                .fragment(null)
                .build()
                .toUriString();
            if (StringUtils.hasText(origin)) {
                return trimTrailingSlash(origin);
            }
        } catch (RuntimeException ignored) {
            /* fallback below */
        }
        String proto = headerFirst(request, "X-Forwarded-Proto", request.getScheme());
        String host = headerFirst(request, "X-Forwarded-Host", request.getHeader("Host"));
        if (!StringUtils.hasText(host)) {
            return "";
        }
        return trimTrailingSlash(proto + "://" + host);
    }

    private static String headerFirst(HttpServletRequest request, String name, String fallback) {
        String value = request.getHeader(name);
        if (StringUtils.hasText(value)) {
            int comma = value.indexOf(',');
            return comma >= 0 ? value.substring(0, comma).trim() : value.trim();
        }
        return fallback == null ? "" : fallback.trim();
    }

    private static String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
