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
 */
@Component
public class InternalApiAuthFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Token";

    private final List<String> expectedTokens;

    public InternalApiAuthFilter(
        @Value("${app.originality.internal-token:}") String originalityToken,
        @Value("${app.moderation.internal-token:}") String moderationToken,
        @Value("${app.content-understanding.internal-token:}") String contentUnderstandingToken,
        @Value("${app.enhancement.internal-token:}") String enhancementToken,
        @Value("${app.translation.internal-token:}") String translationToken
    ) {
        this.expectedTokens = List.of(
            originalityToken,
            moderationToken,
            contentUnderstandingToken,
            enhancementToken,
            translationToken
        );
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
        String provided = request.getHeader(HEADER);
        if (!InternalTokenSecurity.matchesAny(expectedTokens, provided)) {
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
