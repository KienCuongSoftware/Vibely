package com.vibely.backend.auth;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OtpVerificationService otpVerificationService;
    private final UserRepository userRepository;
    private final UserAvatarResolver userAvatarResolver;

    public AuthController(
        AuthService authService,
        OtpVerificationService otpVerificationService,
        UserRepository userRepository,
        UserAvatarResolver userAvatarResolver
    ) {
        this.authService = authService;
        this.otpVerificationService = otpVerificationService;
        this.userRepository = userRepository;
        this.userAvatarResolver = userAvatarResolver;
    }

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.success(authService.refresh(request.getRefreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/send-code")
    public ApiResponse<SendCodeResponse> sendCode(@Valid @RequestBody SendCodeRequest request) {
        return ApiResponse.success(otpVerificationService.sendCode(request));
    }

    @PostMapping("/verify-code")
    public ApiResponse<VerifyCodeResponse> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        return ApiResponse.success(otpVerificationService.verifyCode(request));
    }

    @PostMapping("/oauth/exchange")
    public ApiResponse<AuthResponse> exchangeOauthCode(@Valid @RequestBody OAuthExchangeRequest request) {
        return ApiResponse.success(authService.exchangeOauthCode(request.getCode()));
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
                userAvatarResolver.resolve(user)
            )
        );
    }
}
