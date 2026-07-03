package com.vibely.backend.auth.controller;

import com.vibely.backend.auth.context.LoginContext;
import com.vibely.backend.auth.context.LoginContextService;
import com.vibely.backend.auth.dto.AuthRequest;
import com.vibely.backend.auth.dto.AuthResponse;
import com.vibely.backend.auth.dto.AuthSessionResponse;
import com.vibely.backend.auth.dto.CompleteOnboardingRequest;
import com.vibely.backend.auth.dto.LogoutRequest;
import com.vibely.backend.auth.dto.MeResponse;
import com.vibely.backend.auth.dto.NativeOAuthRequest;
import com.vibely.backend.auth.dto.OAuthExchangeRequest;
import com.vibely.backend.auth.dto.OtpRequestMetadata;
import com.vibely.backend.auth.entity.OtpCodePurpose;
import com.vibely.backend.auth.dto.ReactivateAccountRequest;
import com.vibely.backend.auth.dto.RefreshRequest;
import com.vibely.backend.auth.dto.RegisterRequest;
import com.vibely.backend.auth.dto.ResetPasswordRequest;
import com.vibely.backend.auth.dto.SendCodeRequest;
import com.vibely.backend.auth.dto.SendCodeResponse;
import com.vibely.backend.auth.dto.SendReactivationCodeRequest;
import com.vibely.backend.auth.dto.VerifyCodeRequest;
import com.vibely.backend.auth.dto.VerifyCodeResponse;
import com.vibely.backend.auth.dto.WsTicketResponse;
import com.vibely.backend.auth.service.AuthService;
import com.vibely.backend.auth.service.AuthSessionSupport;
import com.vibely.backend.auth.service.NativeOAuthService;
import com.vibely.backend.auth.service.OtpVerificationService;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.UnauthorizedException;
import com.vibely.backend.security.AuthCookieService;
import com.vibely.backend.security.JwtService;
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
    private final AuthCookieService authCookieService;
    private final JwtService jwtService;
    private final LoginContextService loginContextService;
    private final boolean exposeTokensInApi;

    public AuthController(
        AuthService authService,
        OtpVerificationService otpVerificationService,
        NativeOAuthService nativeOAuthService,
        AuthCookieService authCookieService,
        JwtService jwtService,
        LoginContextService loginContextService,
        @Value("${app.auth.expose-tokens-in-api:false}") boolean exposeTokensInApi
    ) {
        this.authService = authService;
        this.otpVerificationService = otpVerificationService;
        this.nativeOAuthService = nativeOAuthService;
        this.authCookieService = authCookieService;
        this.jwtService = jwtService;
        this.loginContextService = loginContextService;
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
        if (purpose == OtpCodePurpose.ACCOUNT_DEACTIVATION
            || purpose == OtpCodePurpose.ACCOUNT_REACTIVATION
            || purpose == OtpCodePurpose.ACCOUNT_DELETION) {
            throw new BadRequestException("Mục đích mã OTP không hợp lệ");
        }
        return ApiResponse.success(otpVerificationService.sendCode(request, verificationToken));
    }

    @PostMapping("/verify-code")
    public ApiResponse<VerifyCodeResponse> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        OtpCodePurpose purpose = OtpCodePurpose.fromRequestValue(request.getPurpose());
        if (purpose == OtpCodePurpose.ACCOUNT_DEACTIVATION
            || purpose == OtpCodePurpose.ACCOUNT_REACTIVATION
            || purpose == OtpCodePurpose.ACCOUNT_DELETION) {
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
        @Valid @RequestBody SendReactivationCodeRequest request,
        HttpServletRequest httpRequest
    ) {
        LoginContext loginContext = loginContextService.buildContext(httpRequest, request.getLoginContext());
        return ApiResponse.success(authService.sendReactivationCode(request, toMetadata(loginContext)));
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
        return ApiResponse.success(authService.getMe(authentication.getName()));
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

    private OtpRequestMetadata toMetadata(LoginContext context) {
        return new OtpRequestMetadata(
            context.getBrowser() + " trên " + context.getOperatingSystem(),
            displayLocation(context),
            context.getIpAddress()
        );
    }

    private String displayLocation(LoginContext context) {
        StringBuilder location = new StringBuilder();
        appendLocationPart(location, context.getWard());
        appendLocationPart(location, context.getDistrict());
        appendLocationPart(location, context.getCity());
        appendLocationPart(location, context.getProvince());
        appendLocationPart(location, context.getCountry());
        return location.isEmpty() ? "Không xác định" : location.toString();
    }

    private void appendLocationPart(StringBuilder builder, String value) {
        if (value == null || value.isBlank()) {
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
}
