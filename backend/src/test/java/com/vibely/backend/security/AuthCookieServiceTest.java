package com.vibely.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthCookieServiceTest {

    @Test
    void writesAndReadsSessionCookies() {
        AuthCookieService service = new AuthCookieService(900, 1209600, false, "Lax", "");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockHttpServletRequest request = new MockHttpServletRequest();

        service.writeSessionCookies(response, "access-token", "refresh-token");

        request.setCookies(response.getCookies());
        assertThat(service.readAccessToken(request)).contains("access-token");
        assertThat(service.readRefreshToken(request)).contains("refresh-token");

        service.clearSessionCookies(response);
        assertThat(response.getHeaders("Set-Cookie").stream()
            .anyMatch(header -> header.contains(AuthCookieService.ACCESS_COOKIE) && header.contains("Max-Age=0")))
            .isTrue();
    }

    @Test
    void refreshCookieUsesAuthPath() {
        AuthCookieService service = new AuthCookieService(900, 1209600, false, "Lax", "");
        MockHttpServletResponse response = new MockHttpServletResponse();
        service.writeSessionCookies(response, "a", "r");

        Cookie refresh = null;
        for (Cookie cookie : response.getCookies()) {
            if (AuthCookieService.REFRESH_COOKIE.equals(cookie.getName())) {
                refresh = cookie;
            }
        }
        assertThat(refresh).isNotNull();
        assertThat(refresh.getPath()).isEqualTo("/");
    }
}
