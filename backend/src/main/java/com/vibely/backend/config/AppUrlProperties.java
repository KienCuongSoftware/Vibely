package com.vibely.backend.config;

import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.urls")
public class AppUrlProperties {

    private String frontendBaseUrl = "http://localhost:5173";
    private String backendBaseUrl = "http://localhost:8080";
    private String shortLinkBaseUrl = "http://localhost:8080";
    private String deepLinkScheme = "vibely";

    public String normalizedFrontendBaseUrl() {
        return stripTrailingSlash(frontendBaseUrl);
    }

    public String normalizedShortLinkBaseUrl() {
        return stripTrailingSlash(shortLinkBaseUrl);
    }

    public String watchUrl(UUID videoPublicId) {
        return normalizedFrontendBaseUrl() + "/watch/" + videoPublicId;
    }

    public String embedUrl(UUID videoPublicId) {
        return normalizedFrontendBaseUrl() + "/embed/" + videoPublicId;
    }

    public String shortUrl(String shortCode) {
        return normalizedShortLinkBaseUrl() + "/v/" + shortCode;
    }

    public String deepLink(UUID videoPublicId) {
        return deepLinkScheme + "://video/" + videoPublicId;
    }

    private static String stripTrailingSlash(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String s = raw.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    public String getFrontendBaseUrl() {
        return frontendBaseUrl;
    }

    public void setFrontendBaseUrl(String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public String getBackendBaseUrl() {
        return backendBaseUrl;
    }

    public void setBackendBaseUrl(String backendBaseUrl) {
        this.backendBaseUrl = backendBaseUrl;
    }

    public String getShortLinkBaseUrl() {
        return shortLinkBaseUrl;
    }

    public void setShortLinkBaseUrl(String shortLinkBaseUrl) {
        this.shortLinkBaseUrl = shortLinkBaseUrl;
    }

    public String getDeepLinkScheme() {
        return deepLinkScheme;
    }

    public void setDeepLinkScheme(String deepLinkScheme) {
        this.deepLinkScheme = deepLinkScheme;
    }
}
