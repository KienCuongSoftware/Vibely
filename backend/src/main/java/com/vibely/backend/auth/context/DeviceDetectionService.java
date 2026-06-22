package com.vibely.backend.auth.context;

import org.springframework.stereotype.Service;

@Service
public class DeviceDetectionService {

    public DeviceInfo detect(String userAgent) {
        return detect(userAgent, null);
    }

    public DeviceInfo detect(String userAgent, String browserHint) {
        String ua = userAgent == null ? "" : userAgent.toLowerCase();
        return new DeviceInfo(resolveBrowser(ua, browserHint), resolveOperatingSystem(ua), resolveDeviceType(ua));
    }

    private String resolveBrowser(String ua, String browserHint) {
        if (browserHint != null && !browserHint.isBlank()) {
            return normalizeBrowserHint(browserHint);
        }
        if (ua.contains("edg/") || ua.contains("edga/") || ua.contains("edgios/") || ua.contains("edge/")) {
            return "Edge";
        }
        if (ua.contains("coc_coc_browser") || ua.contains("coccocbrowser")) {
            return "Cốc Cốc";
        }
        if (ua.contains("vivaldi/")) {
            return "Vivaldi";
        }
        if (ua.contains("samsungbrowser/")) {
            return "Samsung Internet";
        }
        if (ua.contains("opr/") || ua.contains("opera")) {
            return "Opera";
        }
        if (ua.contains("duckduckgo/")) {
            return "DuckDuckGo";
        }
        if (ua.contains("yabrowser/")) {
            return "Yandex Browser";
        }
        if (ua.contains("firefox/") || ua.contains("fxios/")) {
            return "Firefox";
        }
        if (ua.contains("msie ") || ua.contains("trident/")) {
            return "Internet Explorer";
        }
        if (ua.contains("crios/") || ua.contains("chrome/")) {
            return "Chrome";
        }
        if (ua.contains("safari/")) {
            return "Safari";
        }
        return "Trình duyệt";
    }

    private String normalizeBrowserHint(String browserHint) {
        String normalized = browserHint.trim();
        if (normalized.equalsIgnoreCase("Microsoft Edge")) {
            return "Edge";
        }
        if (normalized.equalsIgnoreCase("Google Chrome")) {
            return "Chrome";
        }
        if (normalized.equalsIgnoreCase("CocCoc")) {
            return "Cốc Cốc";
        }
        return normalized;
    }

    private String resolveOperatingSystem(String ua) {
        if (ua.contains("windows phone")) {
            return "Windows Phone";
        }
        if (ua.contains("cros")) {
            return "ChromeOS";
        }
        if (ua.contains("android")) {
            return "Android";
        }
        if (ua.contains("ipad")) {
            return "iPadOS";
        }
        if (ua.contains("iphone") || ua.contains("ipod")) {
            return "iOS";
        }
        if (ua.contains("windows")) {
            return "Windows";
        }
        if (ua.contains("mac os x") || ua.contains("macintosh")) {
            return "macOS";
        }
        if (ua.contains("ubuntu")) {
            return "Ubuntu";
        }
        if (ua.contains("linux")) {
            return "Linux";
        }
        return "Không xác định";
    }

    private String resolveDeviceType(String ua) {
        if (ua.contains("ipad") || ua.contains("tablet") || (ua.contains("android") && !ua.contains("mobile"))) {
            return "Tablet";
        }
        if (ua.contains("mobile") || ua.contains("iphone") || ua.contains("ipod") || ua.contains("android")) {
            return "Mobile";
        }
        return "Desktop";
    }
}
