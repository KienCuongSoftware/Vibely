package com.vibely.backend.auth.service;

import com.vibely.backend.user.entity.User;
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
        if (StringUtils.hasText(oauthUrl)) {
            if (isOAuthCdnUrl(oauthUrl)) {
                if (user.getId() == null) {
                    return enlargeOAuthAvatarUrl(oauthUrl);
                }
                return oauthAvatarProxyPath(user.getId());
            }
            return oauthUrl;
        }
        if (StringUtils.hasText(user.getAvatarUrl())) {
            return user.getAvatarUrl();
        }
        return DEFAULT_AVATAR_URL;
    }

    public static String oauthAvatarProxyPath(long userId) {
        return "/api/users/oauth-avatar/" + userId;
    }

    /** Facebook / Google CDN URLs — proxy qua Vibely để browser & OG crawler tải ổn. */
    public static boolean isOAuthCdnUrl(String url) {
        if (!StringUtils.hasText(url) || url.startsWith("/")) {
            return false;
        }
        String lower = url.toLowerCase();
        return lower.contains("fbsbx.com")
            || lower.contains("fbcdn.net")
            || lower.contains("lookaside.fbsbx.com")
            || lower.contains("googleusercontent.com")
            || lower.contains("ggpht.com")
            || lower.contains("google.com/a/");
    }

    /**
     * Nâng kích thước ảnh Google profile (s96 → s512) — Facebook cần ≥200px.
     */
    public static String enlargeOAuthAvatarUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return url;
        }
        String value = url.trim();
        String lower = value.toLowerCase();
        if (!(lower.contains("googleusercontent.com") || lower.contains("ggpht.com"))) {
            return value;
        }
        String upgraded = value.replaceAll("(?i)=s\\d+-c\\b", "=s512-c");
        upgraded = upgraded.replaceAll("(?i)=s\\d+\\b", "=s512");
        upgraded = upgraded.replaceAll("(?i)([?&])sz=\\d+", "$1sz=512");
        if (upgraded.equals(value) && !lower.contains("=s512")) {
            if (value.contains("?")) {
                upgraded = value + "&sz=512";
            } else if (value.contains("=")) {
                upgraded = value;
            } else {
                upgraded = value + "=s512-c";
            }
        }
        return upgraded;
    }
}
