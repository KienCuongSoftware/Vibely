package com.vibely.backend.auth.oauth;

import com.vibely.backend.common.ApiError;
import com.vibely.backend.common.ApiResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * When {@code app.oauth2.enabled=false}, browser OAuth URLs must not fall through to AUTH_REQUIRED.
 * Returns a clear 503 so operators know social login is switched off.
 */
@RestController
@ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "false", matchIfMissing = false)
public class OAuth2DisabledController {

    @GetMapping({
        "/api/oauth2/authorization/{registrationId}",
        "/oauth2/authorization/{registrationId}"
    })
    public ResponseEntity<ApiResponse<Void>> disabled(@PathVariable String registrationId) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ApiResponse.failure(ApiError.of(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "OAUTH_DISABLED",
                "Social login is disabled on this server (app.oauth2.enabled=false). "
                    + "Set APP_OAUTH2_ENABLED=true and configure provider credentials."
            )));
    }
}
