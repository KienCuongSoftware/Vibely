package com.vibely.backend.account;

import com.vibely.backend.auth.OtpCodePurpose;
import com.vibely.backend.auth.OtpVerificationService;
import com.vibely.backend.auth.SendCodeRequest;
import com.vibely.backend.auth.SendCodeResponse;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.security.AuthCookieService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account/deactivation")
public class AccountDeactivationController {

    private final OtpVerificationService otpVerificationService;
    private final AccountDeactivationService accountDeactivationService;
    private final AuthCookieService authCookieService;

    public AccountDeactivationController(
        OtpVerificationService otpVerificationService,
        AccountDeactivationService accountDeactivationService,
        AuthCookieService authCookieService
    ) {
        this.otpVerificationService = otpVerificationService;
        this.accountDeactivationService = accountDeactivationService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/send-code")
    public ApiResponse<SendCodeResponse> sendCode(Authentication authentication) {
        SendCodeRequest request = new SendCodeRequest();
        request.setEmail(authentication.getName());
        request.setPurpose(OtpCodePurpose.ACCOUNT_DEACTIVATION.name());
        request.setChallengePassed(true);
        return ApiResponse.success(otpVerificationService.sendCode(request, null));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> deactivate(
        Authentication authentication,
        @Valid @RequestBody DeactivateAccountRequest request,
        HttpServletResponse response
    ) {
        accountDeactivationService.deactivate(authentication.getName(), request.getCode());
        authCookieService.clearSessionCookies(response);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
