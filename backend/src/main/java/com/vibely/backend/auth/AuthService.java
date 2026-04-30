package com.vibely.backend.auth;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.security.JwtService;
import com.vibely.backend.user.Role;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.user.UsernameCheckResponse;
import com.vibely.backend.user.UsernameService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OAuthLoginCodeStore oAuthLoginCodeStore;
    private final UsernameService usernameService;
    private final UserAvatarResolver userAvatarResolver;
    private final long refreshExpirationSeconds;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService,
        RefreshTokenRepository refreshTokenRepository,
        OAuthLoginCodeStore oAuthLoginCodeStore,
        UsernameService usernameService,
        UserAvatarResolver userAvatarResolver,
        @Value("${app.jwt.refresh-expiration-seconds:604800}") long refreshExpirationSeconds
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.oAuthLoginCodeStore = oAuthLoginCodeStore;
        this.usernameService = usernameService;
        this.userAvatarResolver = userAvatarResolver;
        this.refreshExpirationSeconds = refreshExpirationSeconds;
    }

    public AuthResponse register(RegisterRequest request) {
        String normalizedUsername = usernameService.validateForRegistration(request.getUsername());
        UsernameCheckResponse usernameCheck = usernameService.checkAvailability(normalizedUsername);
        if (!usernameCheck.available()) {
            String suffix = usernameCheck.suggestion() != null ? " Gợi ý: @" + usernameCheck.suggestion() : "";
            throw new BadRequestException("Vibely ID đã tồn tại." + suffix);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã được sử dụng");
        }
        User user = new User();
        user.setUsername(normalizedUsername);
        user.setDisplayName(
            request.getDisplayName() != null && !request.getDisplayName().isBlank()
                ? request.getDisplayName().trim()
                : normalizedUsername
        );
        user.setEmail(request.getEmail());
        user.setBio(request.getBio());
        user.setRole(Role.USER);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        User saved = userRepository.save(user);
        return issueTokens(saved);
    }

    public AuthResponse login(AuthRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException ex) {
            throw new BadRequestException("Thông tin đăng nhập không chính xác");
        }
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadRequestException("Thông tin đăng nhập không chính xác"));
        return issueTokens(user);
    }

    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
            .orElseThrow(() -> new BadRequestException("Refresh token không hợp lệ"));
        if (token.isRevoked() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Refresh token đã hết hạn hoặc đã bị thu hồi");
        }
        token.setRevoked(true);
        return issueTokens(token.getUser());
    }

    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
            .ifPresent(token -> token.setRevoked(true));
    }

    /**
     * Upsert user and issue tokens after Google or Facebook OAuth2 login.
     *
     * @param registrationId Spring client registration id, e.g. {@code google} or {@code facebook}
     */
    public AuthResponse authenticateWithOAuthProvider(
        String email,
        String displayName,
        String oauthAvatarUrl,
        String registrationId
    ) {
        boolean isFacebook = "facebook".equalsIgnoreCase(registrationId);
        String providerLabel = isFacebook ? "Facebook" : "Google";

        if (email == null || email.isBlank()) {
            throw new BadRequestException("Tài khoản " + providerLabel + " chưa cung cấp email hợp lệ");
        }

        User user = userRepository.findByEmail(email)
            .orElseGet(() -> {
                User created = new User();
                created.setEmail(email);
                created.setRole(Role.USER);
                String generatedUsername = usernameService.generateFromGoogleEmail(email, null);
                created.setUsername(generatedUsername);
                created.setDisplayName(
                    displayName != null && !displayName.isBlank() ? displayName.trim() : generatedUsername
                );
                created.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                return created;
            });

        // Ensure OAuth-linked users have a Vibely ID derived from email local-part:
        // - lowercase
        // - remove Vietnamese diacritics
        // - remove special characters (keep only a-z0-9)
        boolean usernameMissingOrNotAlphanumeric =
            user.getUsername() == null
                || user.getUsername().isBlank()
                || !user.getUsername().matches("^[a-z0-9]{4,24}$");

        if (usernameMissingOrNotAlphanumeric) {
            user.setUsername(usernameService.generateFromGoogleEmail(email, user.getUsername()));
        }

        if (user.getDisplayName() == null || user.getDisplayName().isBlank()) {
            user.setDisplayName(
                displayName != null && !displayName.isBlank() ? displayName.trim() : user.getUsername()
            );
        }
        if (oauthAvatarUrl != null && !oauthAvatarUrl.isBlank()) {
            user.setGoogleAvatarUrl(oauthAvatarUrl);
        }

        User saved = userRepository.save(user);
        return issueTokens(saved);
    }

    public AuthResponse exchangeOauthCode(String code) {
        return oAuthLoginCodeStore.consumeCode(code);
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateToken(user.getEmail());
        String refreshTokenRaw = generateRefreshToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashToken(refreshTokenRaw));
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshExpirationSeconds));
        refreshToken.setRevoked(false);
        refreshTokenRepository.save(refreshToken);
        refreshTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(1));

        return new AuthResponse(
            accessToken,
            refreshTokenRaw,
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            userAvatarResolver.resolve(user)
        );
    }

    private String generateRefreshToken() {
        String seed = UUID.randomUUID() + ":" + System.nanoTime();
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(seed.getBytes(StandardCharsets.UTF_8));
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }
}
