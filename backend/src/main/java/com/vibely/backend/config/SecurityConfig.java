package com.vibely.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.auth.OAuth2LoginFailureHandler;
import com.vibely.backend.auth.OAuth2LoginSuccessHandler;
import com.vibely.backend.common.ApiError;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.observability.RequestCorrelationFilter;
import com.vibely.backend.security.JwtAuthenticationFilter;
import com.vibely.backend.security.RateLimitFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.vibely.backend.security.AppUserDetailsService;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final AppUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final RequestCorrelationFilter requestCorrelationFilter;
    private final ObjectMapper objectMapper;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    @Value("${app.oauth2.enabled:false}")
    private boolean oauth2Enabled;

    public SecurityConfig(
        AppUserDetailsService userDetailsService,
        JwtAuthenticationFilter jwtAuthenticationFilter,
        RateLimitFilter rateLimitFilter,
        RequestCorrelationFilter requestCorrelationFilter,
        ObjectMapper objectMapper,
        OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
        OAuth2LoginFailureHandler oAuth2LoginFailureHandler
    ) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.requestCorrelationFilter = requestCorrelationFilter;
        this.objectMapper = objectMapper;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
        this.oAuth2LoginFailureHandler = oAuth2LoginFailureHandler;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        HttpSecurity security = http
            .csrf(csrf -> csrf.disable())
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
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/health/**").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                // Không dùng /api/auth/** permitAll — có thể khiến GET /api/auth/me không bắt buộc JWT.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/refresh",
                    "/api/auth/logout",
                    "/api/auth/send-code",
                    "/api/auth/verify-code",
                    "/api/auth/oauth/exchange"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/feed/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/videos/*/comments").permitAll()
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(requestCorrelationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        if (oauth2Enabled) {
            security.oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2LoginSuccessHandler)
                .failureHandler(oAuth2LoginFailureHandler)
            );
        }

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

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
