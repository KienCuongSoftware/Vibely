package com.vibely.backend.auth;

import com.vibely.backend.user.User;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class UserAvatarResolver {

    public static final String DEFAULT_AVATAR_URL = "/images/users/default-avatar.jpeg";

    public String resolve(User user) {
        if (user == null) {
            return DEFAULT_AVATAR_URL;
        }
        if (StringUtils.hasText(user.getAvatarUrl()) && !isOAuthCdnUrl(user.getAvatarUrl())) {
            return user.getAvatarUrl();
        }
        String oauthUrl = user.getGoogleAvatarUrl();
        if (isOAuthCdnUrl(oauthUrl)) {
            return oauthAvatarProxyPath(user.getId());
        }
        if (StringUtils.hasText(user.getAvatarUrl())) {
            return user.getAvatarUrl();
        }
        return DEFAULT_AVATAR_URL;
    }

    public static String oauthAvatarProxyPath(long userId) {
        return "/api/users/oauth-avatar/" + userId;
    }

    /** Facebook CDN URLs often 403/500 when loaded directly in the browser. */
    public static boolean isOAuthCdnUrl(String url) {
        if (!StringUtils.hasText(url) || url.startsWith("/")) {
            return false;
        }
        String lower = url.toLowerCase();
        return lower.contains("fbsbx.com")
            || lower.contains("fbcdn.net")
            || lower.contains("lookaside.fbsbx.com");
    }
}
