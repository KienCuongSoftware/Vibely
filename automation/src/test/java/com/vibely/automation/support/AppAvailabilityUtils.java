package com.vibely.automation.support;

import com.vibely.automation.utils.PropertyUtils;
import org.junit.jupiter.api.Assumptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URI;
import java.net.URL;
import java.net.UnknownHostException;

/**
 * Helpers to detect whether the Vibely application under test is reachable.
 */
public final class AppAvailabilityUtils {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppAvailabilityUtils.class);

    private AppAvailabilityUtils() {
    }

    /**
     * Returns {@code true} when {@code base.url} responds without a connection failure.
     *
     * <p>On Windows, {@code localhost} often resolves to both IPv6 ({@code ::1}) and IPv4
     * ({@code 127.0.0.1}). Vite may listen on only one of them; Java's default connect can pick
     * the wrong family and report connection refused even when the app is up. This method tries
     * every resolved address.</p>
     *
     * @return whether the application appears reachable
     */
    public static boolean isApplicationReachable() {
        String baseUrl = PropertyUtils.baseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return false;
        }

        URI uri;
        try {
            uri = URI.create(baseUrl);
        } catch (IllegalArgumentException e) {
            LOGGER.warn("Invalid base.url '{}': {}", baseUrl, e.toString());
            return false;
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return tryConnect(baseUrl);
        }

        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                String candidate = rewriteHost(uri, formatHostForUrl(address));
                if (tryConnect(candidate)) {
                    return true;
                }
            }
        } catch (UnknownHostException e) {
            LOGGER.warn("Could not resolve host for '{}': {}", baseUrl, e.toString());
        }

        // Last resort: literal base.url (covers odd hosts / already-literal IPs).
        return tryConnect(baseUrl);
    }

    /**
     * Skips the current test when the application is not reachable.
     */
    public static void assumeApplicationReachable() {
        Assumptions.assumeTrue(
                isApplicationReachable(),
                "Vibely app is not reachable at " + PropertyUtils.baseUrl()
                        + ". Start frontend (e.g. npm run dev) or set base.url.");
    }

    private static boolean tryConnect(String urlString) {
        try {
            URL url = URI.create(urlString).toURL();
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(2_000);
            connection.setReadTimeout(2_000);
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.connect();
            int code = connection.getResponseCode();
            connection.disconnect();
            return code > 0;
        } catch (IOException e) {
            LOGGER.debug("Probe failed for '{}': {}", urlString, e.toString());
            return false;
        }
    }

    private static String formatHostForUrl(InetAddress address) {
        String hostAddress = address.getHostAddress();
        // IPv6 literals must be bracketed in URLs.
        if (address instanceof java.net.Inet6Address) {
            int zoneIdx = hostAddress.indexOf('%');
            if (zoneIdx >= 0) {
                hostAddress = hostAddress.substring(0, zoneIdx);
            }
            return "[" + hostAddress + "]";
        }
        return hostAddress;
    }

    private static String rewriteHost(URI uri, String host) {
        int port = uri.getPort();
        StringBuilder builder = new StringBuilder();
        builder.append(uri.getScheme()).append("://").append(host);
        if (port > 0) {
            builder.append(':').append(port);
        }
        String path = uri.getRawPath();
        if (path != null && !path.isBlank()) {
            builder.append(path);
        } else {
            builder.append('/');
        }
        if (uri.getRawQuery() != null) {
            builder.append('?').append(uri.getRawQuery());
        }
        return builder.toString();
    }
}
