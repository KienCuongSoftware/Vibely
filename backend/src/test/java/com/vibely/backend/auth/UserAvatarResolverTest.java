package com.vibely.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.user.User;
import org.junit.jupiter.api.Test;

class UserAvatarResolverTest {

    private final UserAvatarResolver resolver = new UserAvatarResolver();

    @Test
    void resolveGoogleAvatarReturnsDirectUrl() {
        User user = new User();
        user.setId(9L);
        user.setGoogleAvatarUrl("https://lh3.googleusercontent.com/a/example-photo");

        assertThat(resolver.resolve(user))
            .isEqualTo("https://lh3.googleusercontent.com/a/example-photo");
    }

    @Test
    void resolveFacebookAvatarReturnsProxyPath() {
        User user = new User();
        user.setId(42L);
        user.setGoogleAvatarUrl("https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=123");

        assertThat(resolver.resolve(user)).isEqualTo("/api/users/oauth-avatar/42");
    }

    @Test
    void resolvePrefersUploadedAvatarOverOAuthCdn() {
        User user = new User();
        user.setId(7L);
        user.setAvatarUrl("https://cdn.example.com/me.jpg");
        user.setGoogleAvatarUrl("https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=123");

        assertThat(resolver.resolve(user)).isEqualTo("https://cdn.example.com/me.jpg");
    }
}
