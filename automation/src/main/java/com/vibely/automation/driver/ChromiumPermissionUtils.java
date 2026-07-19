package com.vibely.automation.driver;

import com.vibely.automation.utils.PropertyUtils;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chromium.HasCdp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Best-effort Chromium CDP helpers so automation is not blocked by native permission dialogs
 * (geolocation, notifications, etc.).
 */
public final class ChromiumPermissionUtils {

    private static final Logger LOGGER = LoggerFactory.getLogger(ChromiumPermissionUtils.class);

    private ChromiumPermissionUtils() {
    }

    /**
     * Denies geolocation (and related prompts) for the configured app origin before navigation.
     * Safe no-op when the driver does not support CDP.
     */
    public static void denyBlockingPermissions(WebDriver driver) {
        if (!(driver instanceof HasCdp cdp)) {
            return;
        }

        for (String origin : resolveOrigins()) {
            for (String permissionName : List.of("geolocation", "notifications")) {
                try {
                    cdp.executeCdpCommand(
                            "Browser.setPermission",
                            Map.of(
                                    "origin", origin,
                                    "permission", Map.of("name", permissionName),
                                    "setting", "denied"
                            )
                    );
                    LOGGER.debug("Denied '{}' for origin {}", permissionName, origin);
                } catch (RuntimeException e) {
                    LOGGER.debug("CDP setPermission failed for {} @ {}: {}", permissionName, origin, e.toString());
                }
            }
        }
    }

    private static Set<String> resolveOrigins() {
        Set<String> origins = new LinkedHashSet<>();
        String baseUrl = PropertyUtils.baseUrl();
        if (baseUrl != null && !baseUrl.isBlank()) {
            try {
                URI uri = URI.create(baseUrl.trim());
                String origin = uri.getScheme() + "://" + uri.getAuthority();
                origins.add(origin);
                if ("localhost".equalsIgnoreCase(uri.getHost())) {
                    origins.add(uri.getScheme() + "://127.0.0.1"
                            + (uri.getPort() > 0 ? ":" + uri.getPort() : ""));
                } else if ("127.0.0.1".equals(uri.getHost())) {
                    origins.add(uri.getScheme() + "://localhost"
                            + (uri.getPort() > 0 ? ":" + uri.getPort() : ""));
                }
            } catch (IllegalArgumentException e) {
                LOGGER.debug("Could not parse base.url for permission origins: {}", e.toString());
            }
        }
        return origins;
    }
}
