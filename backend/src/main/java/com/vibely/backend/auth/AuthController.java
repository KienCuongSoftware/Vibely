package com.vibely.backend.auth;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.security.AuthCookieService;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OtpVerificationService otpVerificationService;
    private final UserRepository userRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final AuthCookieService authCookieService;
    private final boolean exposeTokensInApi;

    public AuthController(
        AuthService authService,
        OtpVerificationService otpVerificationService,
        UserRepository userRepository,
        UserAvatarResolver userAvatarResolver,
        AuthCookieService authCookieService,
        @Value("${app.auth.expose-tokens-in-api:false}") boolean exposeTokensInApi
    ) {
        this.authService = authService;
        this.otpVerificationService = otpVerificationService;
        this.userRepository = userRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.authCookieService = authCookieService;
        this.exposeTokensInApi = exposeTokensInApi;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> register(
        @Valid @RequestBody RegisterRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.register(request, httpRequest),
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> login(
        @Valid @RequestBody AuthRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.login(request, httpRequest),
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> refresh(
        @RequestBody(required = false) RefreshRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        String refreshToken = resolveRefreshToken(request, httpRequest);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadRequestException("Refresh token là bắt buộc");
        }
        return AuthSessionSupport.ok(
            authService.refresh(refreshToken),
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
        @RequestBody(required = false) LogoutRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        String refreshToken = resolveRefreshToken(request, httpRequest);
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        authCookieService.clearSessionCookies(httpResponse);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/send-code")
    public ApiResponse<SendCodeResponse> sendCode(
        @Valid @RequestBody SendCodeRequest request,
        @RequestHeader(
            value = com.vibely.backend.antibot.auth.AuthProtectionService.CAPTCHA_VERIFICATION_HEADER,
            required = false
        ) String verificationToken
    ) {
        return ApiResponse.success(otpVerificationService.sendCode(request, verificationToken));
    }

    @PostMapping("/verify-code")
    public ApiResponse<VerifyCodeResponse> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        return ApiResponse.success(otpVerificationService.verifyCode(request));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        otpVerificationService.resetPassword(request);
        return ApiResponse.success(null);
    }

    @PostMapping("/oauth/exchange")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> exchangeOauthCode(
        @Valid @RequestBody OAuthExchangeRequest request,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.exchangeOauthCode(request.getCode()),
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/complete-onboarding")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> completeOnboarding(
        Authentication authentication,
        @Valid @RequestBody CompleteOnboardingRequest request,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.completeOnboarding(authentication.getName(), request),
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        return ApiResponse.success(
            new MeResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getBio(),
                userAvatarResolver.resolve(user),
                authService.userRequiresOnboarding(user)
            )
        );
    }

    private String resolveRefreshToken(RefreshRequest request, HttpServletRequest httpRequest) {
        return authCookieService.readRefreshToken(httpRequest)
            .orElseGet(() -> request == null ? null : request.getRefreshToken());
    }

    private String resolveRefreshToken(LogoutRequest request, HttpServletRequest httpRequest) {
        return authCookieService.readRefreshToken(httpRequest)
            .orElseGet(() -> request == null ? null : request.getRefreshToken());
    }
}
