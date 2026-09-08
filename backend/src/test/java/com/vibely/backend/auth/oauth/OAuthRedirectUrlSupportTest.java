package com.vibely.backend.auth.oauth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class OAuthRedirectUrlSupportTest {

    @Test
    void usesConfiguredPublicBaseUrlWhenPresent() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("https");
        request.setServerName("evil.example");
        request.addHeader("X-Forwarded-Host", "evil.example");

        String origin = OAuthRedirectUrlSupport.resolvePublicOrigin(
            request,
            "https://www.vibely.sbs",
            "http://localhost:5173"
        );

        assertThat(origin).isEqualTo("https://www.vibely.sbs");
    }

    @Test
    void ignoresForwardedHostWhenPublicBaseUrlIsMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("https");
        request.setServerName("evil.example");
        request.setServerPort(443);
        request.addHeader("X-Forwarded-Host", "evil.example");
        request.addHeader("X-Forwarded-Proto", "https");

        String origin = OAuthRedirectUrlSupport.resolvePublicOrigin(
            request,
            "",
            "https://www.vibely.sbs"
        );

        assertThat(origin).isEqualTo("https://www.vibely.sbs");
    }

    @Test
    void keepsLocalhostDevFallback() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(8080);

        String origin = OAuthRedirectUrlSupport.resolvePublicOrigin(
            request,
            "",
            "http://localhost:5173"
        );

        assertThat(origin).isEqualTo("http://localhost:5173");
    }
}
