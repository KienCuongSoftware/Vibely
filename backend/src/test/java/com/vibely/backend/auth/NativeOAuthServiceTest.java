package com.vibely.backend.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import org.junit.jupiter.api.Test;

class NativeOAuthServiceTest {

    private NativeOAuthService createService(String facebookAppId, String facebookAppSecret) {
        AuthService authService = mock(AuthService.class);
        return new NativeOAuthService(
            authService,
            new ObjectMapper(),
            "google-client-id",
            facebookAppId,
            facebookAppSecret
        );
    }

    @Test
    void facebookInvalidTokenThrowsBadRequest() {
        NativeOAuthService service = createService("1234567890", "fake-app-secret");

        NativeOAuthRequest request = new NativeOAuthRequest();
        request.setProvider("facebook");
        request.setAccessToken("test");

        assertThatThrownBy(() -> service.authenticate(request))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Facebook");
    }

    @Test
    void unsupportedProviderThrowsBadRequest() {
        NativeOAuthService service = createService("", "");

        NativeOAuthRequest request = new NativeOAuthRequest();
        request.setProvider("twitter");

        assertThatThrownBy(() -> service.authenticate(request))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("không được hỗ trợ");
    }
}
