package com.vibely.backend.account;

import com.vibely.backend.auth.LoginContextRequest;
import com.vibely.backend.auth.OtpCodePurpose;
import com.vibely.backend.auth.OtpRequestMetadata;
import com.vibely.backend.auth.OtpVerificationService;
import com.vibely.backend.auth.SendCodeRequest;
import com.vibely.backend.auth.SendCodeResponse;
import com.vibely.backend.auth.context.LoginContext;
import com.vibely.backend.auth.context.LoginContextService;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.security.AuthCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account/deletion")
public class AccountDeletionController {

    private final OtpVerificationService otpVerificationService;
    private final AccountDeletionService accountDeletionService;
    private final AuthCookieService authCookieService;
    private final LoginContextService loginContextService;

    public AccountDeletionController(
        OtpVerificationService otpVerificationService,
        AccountDeletionService accountDeletionService,
        AuthCookieService authCookieService,
        LoginContextService loginContextService
    ) {
        this.otpVerificationService = otpVerificationService;
        this.accountDeletionService = accountDeletionService;
        this.authCookieService = authCookieService;
        this.loginContextService = loginContextService;
    }

    @PostMapping("/send-code")
    public ApiResponse<SendCodeResponse> sendCode(
        Authentication authentication,
        HttpServletRequest httpRequest,
        @RequestBody(required = false) LoginContextRequest loginContextRequest
    ) {
        SendCodeRequest request = new SendCodeRequest();
        request.setEmail(authentication.getName());
        request.setPurpose(OtpCodePurpose.ACCOUNT_DELETION.name());
        request.setChallengePassed(true);
        LoginContext loginContext = loginContextService.buildContext(httpRequest, loginContextRequest);
        return ApiResponse.success(
            otpVerificationService.sendCode(request, null, toMetadata(loginContext))
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> delete(
        Authentication authentication,
        @Valid @RequestBody DeleteAccountRequest request,
        HttpServletResponse response
    ) {
        accountDeletionService.deletePermanently(authentication.getName(), request.getCode());
        authCookieService.clearSessionCookies(response);
        return ResponseEntity.ok(ApiResponse.success(null));
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
