package com.vibely.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.ApiError;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.observability.RequestCorrelationFilter;
import com.vibely.backend.security.JwtAuthenticationFilter;
import com.vibely.backend.security.RateLimitFilter;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.vibely.backend.security.AppUserDetailsService;
import com.vibely.backend.security.AuthCookieService;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final AppUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final RequestCorrelationFilter requestCorrelationFilter;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    @Value("${app.cors.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    @Value("${app.oauth2.enabled:false}")
    private boolean oauth2Enabled;

    public SecurityConfig(
        AppUserDetailsService userDetailsService,
        JwtAuthenticationFilter jwtAuthenticationFilter,
        RateLimitFilter rateLimitFilter,
        RequestCorrelationFilter requestCorrelationFilter,
        ObjectMapper objectMapper,
        Environment environment
    ) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.requestCorrelationFilter = requestCorrelationFilter;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    @Bean
    @Order(2)
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookiePath("/");
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName(null);

        HttpSecurity security = http
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
                .csrfTokenRequestHandler(csrfHandler)
                .requireCsrfProtectionMatcher(cookieSessionCsrfMatcher())
                .ignoringRequestMatchers(this::shouldIgnoreCsrf)
            )
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(
                oauth2Enabled ? SessionCreationPolicy.IF_REQUIRED : SessionCreationPolicy.STATELESS
            ))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    writeErrorResponse(
                        response,
                        HttpStatus.UNAUTHORIZED,
                        "AUTH_REQUIRED",
                        "Bạn cần đăng nhập để sử dụng chức năng này"
                    )
                )
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    writeErrorResponse(
                        response,
                        HttpStatus.FORBIDDEN,
                        "ACCESS_DENIED",
                        "Bạn không có quyền truy cập tài nguyên này"
                    )
                )
            )
            .authorizeHttpRequests(auth -> {
                var chain = auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/ws", "/ws/**").permitAll()
                .requestMatchers("/api/health/**").permitAll();
                if (isProdProfile()) {
                    chain = chain
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").denyAll();
                } else {
                    chain = chain.requestMatchers(
                        "/actuator/health",
                        "/actuator/info",
                        "/actuator/prometheus"
                    ).permitAll();
                }
                chain
                .requestMatchers("/oauth2/**", "/login/**").permitAll()
                // Không dùng /api/auth/** permitAll — có thể khiến GET /api/auth/me không bắt buộc JWT.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/refresh",
                    "/api/auth/logout",
                    "/api/auth/send-code",
                    "/api/auth/verify-code",
                    "/api/auth/reset-password",
                    "/api/auth/reactivation/send-code",
                    "/api/auth/reactivation/confirm",
                    "/api/auth/oauth/exchange",
                    "/api/auth/oauth/native"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/me", "/api/auth/ws-ticket").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/risk/evaluate").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/captcha/challenge").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/captcha/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/fingerprint/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/behavior/track").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/trust/evaluate").permitAll()
                .requestMatchers(HttpMethod.GET, "/v/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/share/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/feed/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/explore/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/history").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/search/suggest").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/users").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/videos").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/hashtags").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/trending").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/me/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/videos/*/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/videos/*/comments").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/videos/sound").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/videos/*/views").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/videos/*/shares").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/videos/*/share").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/videos/*/share/analytics").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/videos/*/download").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/videos/*").permitAll()
                .anyRequest().authenticated();
            })
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(requestCorrelationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // OAuth2 login is handled by OAuth2LoginSecurityConfiguration (@Order(1)).

        return security.build();
    }

    private void writeErrorResponse(
        HttpServletResponse response,
        HttpStatus status,
        String code,
        String message
    ) {
        response.setStatus(status.value());
        response.setContentType("application/json");
        ApiResponse<Void> payload = ApiResponse.failure(ApiError.of(status.value(), code, message));
        try {
            objectMapper.writeValue(response.getWriter(), payload);
        } catch (Exception ignored) {
            response.setStatus(status.value());
        }
    }

    @Bean
    AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private boolean isProdProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    private boolean shouldIgnoreCsrf(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return true;
        }
        String uri = request.getRequestURI();
        if (uri.startsWith("/ws")) {
            return true;
        }
        if (!"POST".equals(request.getMethod())) {
            return false;
        }
        return uri.equals("/api/auth/register")
            || uri.equals("/api/auth/login")
            || uri.equals("/api/auth/refresh")
            || uri.equals("/api/auth/logout")
            || uri.equals("/api/auth/send-code")
            || uri.equals("/api/auth/verify-code")
            || uri.equals("/api/auth/reset-password")
            || uri.equals("/api/auth/reactivation/send-code")
            || uri.equals("/api/auth/reactivation/confirm")
            || uri.equals("/api/auth/oauth/exchange")
            || uri.equals("/api/auth/oauth/native")
            || uri.equals("/api/risk/evaluate")
            || uri.equals("/api/captcha/verify")
            || uri.equals("/api/fingerprint/register")
            || uri.equals("/api/behavior/track")
            || uri.equals("/api/trust/evaluate");
    }

    /** CSRF for POST/PUT/PATCH/DELETE when the browser sent Vibely session cookies. */
    private RequestMatcher cookieSessionCsrfMatcher() {
        return request -> {
            String method = request.getMethod();
            if (method == null
                || HttpMethod.GET.matches(method)
                || HttpMethod.HEAD.matches(method)
                || HttpMethod.OPTIONS.matches(method)
                || HttpMethod.TRACE.matches(method)) {
                return false;
            }
            Cookie[] cookies = request.getCookies();
            if (cookies == null) {
                return false;
            }
            return Arrays.stream(cookies).anyMatch(cookie ->
                AuthCookieService.ACCESS_COOKIE.equals(cookie.getName())
                    || AuthCookieService.REFRESH_COOKIE.equals(cookie.getName())
            );
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
        configuration.setAllowedOrigins(origins);
        List<String> originPatterns = Arrays.stream(allowedOriginPatterns.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
        if (!originPatterns.isEmpty()) {
            configuration.setAllowedOriginPatterns(originPatterns);
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
