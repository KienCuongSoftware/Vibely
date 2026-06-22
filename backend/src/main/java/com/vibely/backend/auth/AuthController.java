package com.vibely.backend.auth;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.common.UnauthorizedException;
import com.vibely.backend.security.AuthCookieService;
import com.vibely.backend.security.JwtService;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
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
    private final NativeOAuthService nativeOAuthService;
    private final UserRepository userRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final AuthCookieService authCookieService;
    private final JwtService jwtService;
    private final boolean exposeTokensInApi;

    public AuthController(
        AuthService authService,
        OtpVerificationService otpVerificationService,
        NativeOAuthService nativeOAuthService,
        UserRepository userRepository,
        UserAvatarResolver userAvatarResolver,
        AuthCookieService authCookieService,
        JwtService jwtService,
        @Value("${app.auth.expose-tokens-in-api:false}") boolean exposeTokensInApi
    ) {
        this.authService = authService;
        this.otpVerificationService = otpVerificationService;
        this.nativeOAuthService = nativeOAuthService;
        this.userRepository = userRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.authCookieService = authCookieService;
        this.jwtService = jwtService;
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
            httpRequest,
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
            httpRequest,
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
            authCookieService.clearSessionCookies(httpResponse);
            return ResponseEntity.ok(ApiResponse.success(null));
        }
        try {
            return AuthSessionSupport.ok(
                authService.refresh(refreshToken),
                httpRequest,
                httpResponse,
                authCookieService,
                exposeTokensInApi
            );
        } catch (BadRequestException ex) {
            authCookieService.clearSessionCookies(httpResponse);
            return ResponseEntity.ok(ApiResponse.success(null));
        }
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
        OtpCodePurpose purpose = OtpCodePurpose.fromRequestValue(request.getPurpose());
        if (purpose == OtpCodePurpose.ACCOUNT_DEACTIVATION || purpose == OtpCodePurpose.ACCOUNT_REACTIVATION) {
            throw new BadRequestException("Mục đích mã OTP không hợp lệ");
        }
        return ApiResponse.success(otpVerificationService.sendCode(request, verificationToken));
    }

    @PostMapping("/verify-code")
    public ApiResponse<VerifyCodeResponse> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        OtpCodePurpose purpose = OtpCodePurpose.fromRequestValue(request.getPurpose());
        if (purpose == OtpCodePurpose.ACCOUNT_DEACTIVATION || purpose == OtpCodePurpose.ACCOUNT_REACTIVATION) {
            throw new BadRequestException("Mục đích mã OTP không hợp lệ");
        }
        return ApiResponse.success(otpVerificationService.verifyCode(request));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        otpVerificationService.resetPassword(request);
        return ApiResponse.success(null);
    }

    @PostMapping("/reactivation/send-code")
    public ApiResponse<SendCodeResponse> sendReactivationCode(
        @Valid @RequestBody SendReactivationCodeRequest request
    ) {
        return ApiResponse.success(authService.sendReactivationCode(request));
    }

    @PostMapping("/reactivation/confirm")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> reactivateAccount(
        @Valid @RequestBody ReactivateAccountRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.reactivateAccount(request, httpRequest),
            httpRequest,
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/oauth/native")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> oauthNative(
        @Valid @RequestBody NativeOAuthRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            nativeOAuthService.authenticate(request),
            httpRequest,
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/oauth/exchange")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> exchangeOauthCode(
        @Valid @RequestBody OAuthExchangeRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.exchangeOauthCode(request.getCode()),
            httpRequest,
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @PostMapping("/complete-onboarding")
    public ResponseEntity<ApiResponse<AuthSessionResponse>> completeOnboarding(
        Authentication authentication,
        @Valid @RequestBody CompleteOnboardingRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        return AuthSessionSupport.ok(
            authService.completeOnboarding(authentication.getName(), request),
            httpRequest,
            httpResponse,
            authCookieService,
            exposeTokensInApi
        );
    }

    @GetMapping("/ws-ticket")
    public ResponseEntity<ApiResponse<WsTicketResponse>> wsTicket(
        HttpServletRequest request,
        HttpServletResponse response,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        String token = authCookieService.readAccessToken(request).orElse(null);
        if ((token == null || token.isBlank())
            && authorization != null
            && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        }
        if (token != null && !token.isBlank() && jwtService.isTokenValid(token)) {
            return ResponseEntity.ok(ApiResponse.success(new WsTicketResponse(token)));
        }

        String refreshToken = authCookieService.readRefreshToken(request).orElse(null);
        if (refreshToken == null || refreshToken.isBlank()) {
            authCookieService.clearSessionCookies(response);
            return ResponseEntity.ok(ApiResponse.success(null));
        }
        try {
            AuthResponse refreshed = authService.refresh(refreshToken);
            authCookieService.writeSessionCookies(
                response,
                refreshed.accessToken(),
                refreshed.refreshToken()
            );
            return ResponseEntity.ok(ApiResponse.success(new WsTicketResponse(refreshed.accessToken())));
        } catch (BadRequestException ex) {
            authCookieService.clearSessionCookies(response);
            return ResponseEntity.ok(ApiResponse.success(null));
        }
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(Authentication authentication, HttpServletRequest request) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            if (hasBearerToken(request)) {
                throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
            }
            return ApiResponse.success(null);
        }
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
                user.getRole().name(),
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

    private static boolean hasBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)
            && !header.substring(7).trim().isEmpty();
    }
}
