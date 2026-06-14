package com.vibely.backend.share;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class SharePreviewOriginResolverTest {

    @Test
    void usesConfiguredOriginWhenPublic() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "evil.example.com");
        request.addHeader("X-Forwarded-Host", "evil.example.com");
        request.addHeader("X-Forwarded-Proto", "https");

        assertEquals(
            "https://vibely.app",
            SharePreviewOriginResolver.resolve("https://vibely.app", request)
        );
    }

    @Test
    void usesRequestOriginWhenConfiguredIsLocalhost() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "harbour-many-tapes-linking.trycloudflare.com");
        request.addHeader("X-Forwarded-Host", "harbour-many-tapes-linking.trycloudflare.com");
        request.addHeader("X-Forwarded-Proto", "https");

        assertEquals(
            "https://harbour-many-tapes-linking.trycloudflare.com",
            SharePreviewOriginResolver.resolve("http://localhost:8001", request)
        );
    }

    @Test
    void fallsBackToLocalhostWhenRequestIsAlsoLocal() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "localhost:8001");

        assertEquals(
            "http://localhost:8001",
            SharePreviewOriginResolver.resolve("http://localhost:8001", request)
        );
    }
}
