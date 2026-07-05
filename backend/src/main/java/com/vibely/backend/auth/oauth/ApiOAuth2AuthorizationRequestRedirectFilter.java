package com.vibely.backend.auth.oauth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/** Same behavior as {@code OAuth2AuthorizationRequestRedirectFilter} with a custom authorization base path. */
public final class ApiOAuth2AuthorizationRequestRedirectFilter extends OncePerRequestFilter {

    private final OAuth2AuthorizationRequestResolver authorizationRequestResolver;
    private final String authorizationRequestBaseUri;
    private final AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequestRepository =
        new HttpSessionOAuth2AuthorizationRequestRepository();
    private final RedirectStrategy authorizationRedirectStrategy = new DefaultRedirectStrategy();

    public ApiOAuth2AuthorizationRequestRedirectFilter(
        OAuth2AuthorizationRequestResolver authorizationRequestResolver,
        String authorizationRequestBaseUri
    ) {
        this.authorizationRequestResolver = authorizationRequestResolver;
        this.authorizationRequestBaseUri =
            authorizationRequestBaseUri == null ? "" : authorizationRequestBaseUri.trim();
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String registrationId = resolveRegistrationId(request);
        if (!StringUtils.hasText(registrationId)) {
            filterChain.doFilter(request, response);
            return;
        }

        OAuth2AuthorizationRequest authorizationRequest =
            authorizationRequestResolver.resolve(request, registrationId);
        if (authorizationRequest == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        authorizationRequestRepository.saveAuthorizationRequest(authorizationRequest, request, response);
        authorizationRedirectStrategy.sendRedirect(
            request,
            response,
            authorizationRequest.getAuthorizationRequestUri()
        );
    }

    private String resolveRegistrationId(HttpServletRequest request) {
        if (request == null || !StringUtils.hasText(authorizationRequestBaseUri)) {
            return null;
        }
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (StringUtils.hasText(contextPath) && uri.startsWith(contextPath)) {
            uri = uri.substring(contextPath.length());
        }
        String prefix = authorizationRequestBaseUri.endsWith("/")
            ? authorizationRequestBaseUri
            : authorizationRequestBaseUri + "/";
        if (!uri.startsWith(prefix)) {
            return null;
        }
        String remainder = uri.substring(prefix.length());
        if (!StringUtils.hasText(remainder)) {
            return null;
        }
        int slash = remainder.indexOf('/');
        return slash >= 0 ? remainder.substring(0, slash) : remainder;
    }
}
