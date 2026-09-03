package com.vibely.backend.auth.service;

import com.vibely.backend.user.entity.User;
import java.net.URI;
import java.util.Locale;
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
        if (!StringUtils.hasText(oauthUrl)
            && StringUtils.hasText(user.getAvatarUrl())
            && isOAuthCdnUrl(user.getAvatarUrl())) {
            oauthUrl = user.getAvatarUrl();
        }
        if (StringUtils.hasText(oauthUrl)) {
            if (isOAuthCdnUrl(oauthUrl)) {
                if (user.getId() == null) {
                    return enlargeOAuthAvatarUrl(oauthUrl);
                }
                return oauthAvatarProxyPath(user.getId());
            }
            return oauthUrl;
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
        try {
            URI uri = URI.create(url.trim());
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))) {
                return false;
            }
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return false;
            }
            String lower = host.toLowerCase(Locale.ROOT);
            return lower.equals("fbsbx.com")
                || lower.endsWith(".fbsbx.com")
                || lower.equals("fbcdn.net")
                || lower.endsWith(".fbcdn.net")
                || lower.equals("lookaside.fbsbx.com")
                || lower.endsWith(".lookaside.fbsbx.com")
                || lower.equals("googleusercontent.com")
                || lower.endsWith(".googleusercontent.com")
                || lower.equals("ggpht.com")
                || lower.endsWith(".ggpht.com")
                || lower.equals("google.com")
                || lower.endsWith(".google.com");
        } catch (Exception ex) {
            return false;
        }
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
