package com.vibely.backend.auth.context;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver();

    @Test
    void prefersCloudflareConnectingIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.4");
        request.addHeader("CF-Connecting-IP", "113.161.1.2");
        request.addHeader("X-Forwarded-For", "10.0.0.1, 10.0.0.2");

        assertThat(resolver.resolve(request)).isEqualTo("113.161.1.2");
    }

    @Test
    void usesFirstForwardedIpBeforeDockerRemoteAddress() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.4");
        request.addHeader("X-Forwarded-For", "203.0.113.9, 172.18.0.4");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.9");
    }
}
