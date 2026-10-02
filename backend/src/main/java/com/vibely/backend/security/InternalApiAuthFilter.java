package com.vibely.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Worker callbacks on {@code /api/internal/**} must present a valid {@code X-Internal-Token}.
 * Missing or wrong tokens get 404 so the path is not advertised.
 *
 * <p>SRS HTTP hooks cannot send custom headers, so {@code /api/internal/live/media/**} also accepts
 * the token as the {@code hook_token} query parameter. That path accepts only the media hook token,
 * and the media hook token is not valid for any other internal endpoint.
 */
@Component
public class InternalApiAuthFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Token";
    public static final String MEDIA_HOOK_PATH = "/api/internal/live/media/";
    public static final String MEDIA_HOOK_TOKEN_PARAM = "hook_token";

    private final List<String> expectedTokens;
    private final boolean mediaEnabled;
    private final String mediaHookToken;

    public InternalApiAuthFilter(
        @Value("${app.originality.internal-token:}") String originalityToken,
        @Value("${app.moderation.internal-token:}") String moderationToken,
        @Value("${app.content-understanding.internal-token:}") String contentUnderstandingToken,
        @Value("${app.enhancement.internal-token:}") String enhancementToken,
        @Value("${app.translation.internal-token:}") String translationToken,
        @Value("${live.media.enabled:false}") boolean mediaEnabled,
        @Value("${live.media.hook-token:}") String mediaHookToken
    ) {
        this.expectedTokens = List.of(
            originalityToken,
            moderationToken,
            contentUnderstandingToken,
            enhancementToken,
            translationToken
        );
        this.mediaEnabled = mediaEnabled;
        this.mediaHookToken = mediaHookToken;
    }

    private boolean isAuthorized(HttpServletRequest request) {
        if (request.getRequestURI().startsWith(MEDIA_HOOK_PATH)) {
            if (!mediaEnabled || mediaHookToken == null || mediaHookToken.isBlank()) {
                return false;
            }
            String provided = request.getHeader(HEADER);
            if (provided == null) {
                provided = request.getParameter(MEDIA_HOOK_TOKEN_PARAM);
            }
            return InternalTokenSecurity.matches(mediaHookToken, provided);
        }
        return InternalTokenSecurity.matchesAny(expectedTokens, request.getHeader(HEADER));
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/internal/");
    }

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        if (!isAuthorized(request)) {
            response.setStatus(HttpStatus.NOT_FOUND.value());
            return;
        }
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                "internal-worker",
                null,
                AuthorityUtils.createAuthorityList("ROLE_INTERNAL")
            );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }
}
