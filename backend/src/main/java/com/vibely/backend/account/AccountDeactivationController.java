package com.vibely.backend.account;

import com.vibely.backend.auth.dto.LoginContextRequest;
import com.vibely.backend.auth.entity.OtpCodePurpose;
import com.vibely.backend.auth.dto.OtpRequestMetadata;
import com.vibely.backend.auth.service.OtpVerificationService;
import com.vibely.backend.auth.dto.SendCodeRequest;
import com.vibely.backend.auth.dto.SendCodeResponse;
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
@RequestMapping("/api/account/deactivation")
public class AccountDeactivationController {

    private final OtpVerificationService otpVerificationService;
    private final AccountDeactivationService accountDeactivationService;
    private final AuthCookieService authCookieService;
    private final LoginContextService loginContextService;

    public AccountDeactivationController(
        OtpVerificationService otpVerificationService,
        AccountDeactivationService accountDeactivationService,
        AuthCookieService authCookieService,
        LoginContextService loginContextService
    ) {
        this.otpVerificationService = otpVerificationService;
        this.accountDeactivationService = accountDeactivationService;
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
        request.setPurpose(OtpCodePurpose.ACCOUNT_DEACTIVATION.name());
        request.setChallengePassed(true);
        LoginContext loginContext = loginContextService.buildContext(httpRequest, loginContextRequest);
        return ApiResponse.success(
            otpVerificationService.sendCode(request, null, toMetadata(loginContext))
        );
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
