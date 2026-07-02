package com.vibely.backend.auth;

import com.vibely.backend.antibot.auth.AuthProtectionService;
import com.vibely.backend.auth.context.UserLoginHistory;
import com.vibely.backend.auth.context.UserLoginHistoryRepository;
import com.vibely.backend.auth.context.LoginContextService;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import com.vibely.backend.security.JwtService;
import com.vibely.backend.user.entity.Role;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.user.dto.UsernameCheckResponse;
import com.vibely.backend.user.service.UsernameService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
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
    private final AuthProtectionService authProtectionService;
    private final LoginContextService loginContextService;
    private final OtpVerificationService otpVerificationService;
    private final AccountReactivationTokenStore reactivationTokenStore;
    private final UserLoginHistoryRepository loginHistoryRepository;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService,
        RefreshTokenRepository refreshTokenRepository,
        OAuthLoginCodeStore oAuthLoginCodeStore,
        UsernameService usernameService,
        UserAvatarResolver userAvatarResolver,
        AuthProtectionService authProtectionService,
        LoginContextService loginContextService,
        OtpVerificationService otpVerificationService,
        AccountReactivationTokenStore reactivationTokenStore,
        UserLoginHistoryRepository loginHistoryRepository,
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
        this.authProtectionService = authProtectionService;
        this.loginContextService = loginContextService;
        this.otpVerificationService = otpVerificationService;
        this.reactivationTokenStore = reactivationTokenStore;
        this.loginHistoryRepository = loginHistoryRepository;
        this.refreshExpirationSeconds = refreshExpirationSeconds;
    }

    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        authProtectionService.guardRegister(
            request.getEmail(),
            httpRequest.getHeader(AuthProtectionService.CAPTCHA_VERIFICATION_HEADER),
            httpRequest.getHeader("X-Session-Id"),
            httpRequest.getHeader("X-Device-Hash"),
            httpRequest
        );
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
        user.setBirthDate(validateBirthDate(request.getBirthDate()));
        user.setOnboardingCompleted(true);
        User saved = userRepository.save(user);
        authProtectionService.consumeRegisterVerification(httpRequest);
        authProtectionService.onRegisterSuccess(request.getEmail(), httpRequest);
        return issueTokens(saved);
    }

    public AuthResponse login(AuthRequest request, HttpServletRequest httpRequest) {
        authProtectionService.guardLogin(
            request.getEmail(),
            httpRequest.getHeader(AuthProtectionService.CAPTCHA_VERIFICATION_HEADER),
            httpRequest.getHeader("X-Session-Id"),
            httpRequest.getHeader("X-Device-Hash"),
            httpRequest
        );
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException ex) {
            authProtectionService.onLoginFailure(request.getEmail(), httpRequest);
            userRepository.findByEmail(request.getEmail())
                .filter(user -> !user.isActive())
                .ifPresent(user -> {
                    throw new AccountDeactivatedException(user.getEmail());
                });
            throw new BadRequestException("Thông tin đăng nhập không chính xác");
        }
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadRequestException("Thông tin đăng nhập không chính xác"));
        ensureActive(user);
        authProtectionService.consumeLoginVerification(httpRequest);
        authProtectionService.onLoginSuccess(request.getEmail(), httpRequest);
        loginContextService.recordSuccessfulLogin(user, httpRequest, request.getLoginContext());
        return issueTokens(user);
    }

    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
            .orElseThrow(() -> new BadRequestException("Refresh token không hợp lệ"));
        if (token.isRevoked() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Refresh token đã hết hạn hoặc đã bị thu hồi");
        }
        ensureActive(token.getUser());
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
     * @param registrationId Spring client registration id, e.g. {@code google}, {@code facebook}, or {@code line}
     */
    public AuthResponse authenticateWithOAuthProvider(
        String email,
        String displayName,
        String oauthAvatarUrl,
        String registrationId
    ) {
        String providerLabel = oauthProviderLabel(registrationId);

        if (email == null || email.isBlank()) {
            throw new BadRequestException("Tài khoản " + providerLabel + " chưa cung cấp email hợp lệ");
        }

        var existingUser = userRepository.findByEmail(email);
        existingUser.ifPresent(this::ensureActive);
        User user = existingUser.orElseGet(() -> {
            User created = new User();
            created.setEmail(email);
            created.setRole(Role.USER);
            created.setUsername(generatePendingUsername());
            created.setOnboardingCompleted(false);
            created.setDisplayName(
                displayName != null && !displayName.isBlank() ? displayName.trim() : created.getUsername()
            );
            created.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            return created;
        });

        if (user.isOnboardingCompleted()) {
            boolean usernameMissingOrNotAlphanumeric =
                user.getUsername() == null
                    || user.getUsername().isBlank()
                    || !user.getUsername().matches("^[a-z0-9]{4,24}$");

            if (usernameMissingOrNotAlphanumeric) {
                user.setUsername(usernameService.generateFromGoogleEmail(email, user.getUsername()));
            }
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

    public SendCodeResponse sendReactivationCode(
        SendReactivationCodeRequest request,
        OtpRequestMetadata metadata
    ) {
        String email = reactivationTokenStore.resolveEmail(request.getReactivationToken()).trim().toLowerCase();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với email này"));
        if (user.isActive()) {
            throw new BadRequestException("Tài khoản này đang hoạt động");
        }

        SendCodeRequest sendCodeRequest = new SendCodeRequest();
        sendCodeRequest.setEmail(user.getEmail());
        sendCodeRequest.setPurpose(OtpCodePurpose.ACCOUNT_REACTIVATION.name());
        sendCodeRequest.setChallengePassed(true);
        return otpVerificationService.sendCode(sendCodeRequest, null, enrichReactivationMetadata(user, metadata));
    }

    public AuthResponse reactivateAccount(ReactivateAccountRequest request, HttpServletRequest httpRequest) {
        String email = reactivationTokenStore.resolveEmail(request.getReactivationToken()).trim().toLowerCase();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với email này"));
        if (user.isActive()) {
            throw new BadRequestException("Tài khoản này đang hoạt động");
        }

        otpVerificationService.consumeAccountReactivationCode(user.getEmail(), request.getCode());
        user.setAccountStatus(UserAccountStatus.ACTIVE);
        user.setDeactivatedAt(null);
        User saved = userRepository.save(user);
        reactivationTokenStore.invalidate(request.getReactivationToken());
        loginContextService.recordSuccessfulLogin(saved, httpRequest, null);
        return issueTokens(saved);
    }

    public boolean userRequiresOnboarding(User user) {
        return userRequiresOnboardingCheck(user);
    }

    public MeResponse getMe(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        return new MeResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            user.getBio(),
            userAvatarResolver.resolve(user),
            user.getRole().name(),
            userRequiresOnboardingCheck(user)
        );
    }

    public AuthResponse completeOnboarding(String email, CompleteOnboardingRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));
        if (!userRequiresOnboardingCheck(user)) {
            throw new BadRequestException("Tài khoản đã hoàn tất thiết lập");
        }

        user.setBirthDate(validateBirthDate(request.getBirthDate()));

        if (userNeedsUsernameSelection(user)) {
            String normalizedUsername = usernameService.validateForRegistration(request.getUsername());
            boolean takenByOther =
                userRepository.existsByUsername(normalizedUsername)
                    && !normalizedUsername.equals(user.getUsername());
            if (takenByOther) {
                UsernameCheckResponse usernameCheck = usernameService.checkAvailability(normalizedUsername);
                String suffix = usernameCheck.suggestion() != null ? " Gợi ý: @" + usernameCheck.suggestion() : "";
                throw new BadRequestException("Vibely ID đã tồn tại." + suffix);
            }
            user.setUsername(normalizedUsername);
            if (user.getDisplayName() == null || user.getDisplayName().isBlank()) {
                user.setDisplayName(normalizedUsername);
            }
        }

        user.setOnboardingCompleted(true);
        User saved = userRepository.save(user);
        return issueTokens(saved);
    }

    /** Google, Facebook, LINE — chưa hoàn tất hồ sơ (Vibely ID tạm hoặc thiếu ngày sinh). */
    private static boolean userRequiresOnboardingCheck(User user) {
        if (!user.isOnboardingCompleted()) {
            return true;
        }
        if (user.getBirthDate() == null) {
            return true;
        }
        return userNeedsUsernameSelection(user);
    }

    private static boolean userNeedsUsernameSelection(User user) {
        String username = user.getUsername();
        if (username == null || username.isBlank()) {
            return true;
        }
        return username.startsWith("tmp.");
    }

    private static LocalDate validateBirthDate(LocalDate birthDate) {
        if (birthDate == null) {
            throw new BadRequestException("Vui lòng chọn ngày sinh");
        }
        if (birthDate.isAfter(LocalDate.now().minusYears(13))) {
            throw new BadRequestException("Bạn phải đủ 13 tuổi để sử dụng Vibely");
        }
        if (birthDate.isBefore(LocalDate.of(1900, 1, 1))) {
            throw new BadRequestException("Ngày sinh không hợp lệ");
        }
        return birthDate;
    }

    private String generatePendingUsername() {
        String candidate;
        do {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            candidate = "tmp." + suffix;
        } while (userRepository.existsByUsername(candidate));
        return candidate;
    }

    public AuthResponse exchangeOauthCode(String code) {
        return oAuthLoginCodeStore.consumeCode(code);
    }

    private AuthResponse issueTokens(User user) {
        ensureActive(user);
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
            user.getRole().name(),
            userAvatarResolver.resolve(user),
            userRequiresOnboardingCheck(user)
        );
    }

    private void ensureActive(User user) {
        if (!user.isActive()) {
            throw new AccountDeactivatedException(user.getEmail());
        }
    }

    private OtpRequestMetadata enrichReactivationMetadata(User user, OtpRequestMetadata metadata) {
        if (metadata != null && !isUnknown(metadata.approximateLocation())) {
            return metadata;
        }
        String fallbackLocation = loginHistoryRepository.findTop10ByUserIdOrderByLoginTimeDesc(user.getId()).stream()
            .map(this::displayLoginHistoryLocation)
            .filter(location -> !isUnknown(location))
            .findFirst()
            .orElse("Không xác định");
        return new OtpRequestMetadata(
            metadata == null ? "Trình duyệt" : metadata.browser(),
            fallbackLocation,
            metadata == null ? "Không xác định" : metadata.ipAddress()
        );
    }

    private String displayLoginHistoryLocation(UserLoginHistory history) {
        StringBuilder location = new StringBuilder();
        appendLocationPart(location, history.getWard());
        appendLocationPart(location, history.getDistrict());
        appendLocationPart(location, history.getCity());
        appendLocationPart(location, history.getProvince());
        appendLocationPart(location, history.getCountry());
        return location.isEmpty() ? "Không xác định" : location.toString();
    }

    private void appendLocationPart(StringBuilder builder, String value) {
        if (value == null || value.isBlank() || "Không xác định".equalsIgnoreCase(value.trim())) {
            return;
        }
        String normalized = value.trim().replace('+', ' ');
        if (builder.indexOf(normalized) >= 0) {
            return;
        }
        if (!builder.isEmpty()) {
            builder.append(", ");
        }
        builder.append(normalized);
    }

    private boolean isUnknown(String value) {
        return value == null || value.isBlank() || "Không xác định".equalsIgnoreCase(value.trim());
    }

    private static String oauthProviderLabel(String registrationId) {
        if (registrationId == null) {
            return "Google";
        }
        return switch (registrationId.toLowerCase()) {
            case "facebook" -> "Facebook";
            case "line" -> "LINE";
            default -> "Google";
        };
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
