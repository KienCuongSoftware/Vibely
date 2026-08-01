package com.vibely.backend.auth.context;

import com.fasterxml.jackson.databind.JsonNode;
import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.GeoIp2Exception;
import com.maxmind.geoip2.model.CityResponse;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Resolves approximate location from a client IP.
 *
 * <p>Order: MaxMind GeoLite2 City (optional file) → HTTP IP API fallback (for VPS when the
 * database is not mounted). Private/loopback IPs stay unknown.</p>
 */
@Service
public class GeoIpService {

    private static final Logger log = LoggerFactory.getLogger(GeoIpService.class);

    private final String databasePath;
    private final boolean httpFallbackEnabled;
    private final RestClient restClient;
    private volatile DatabaseReader reader;

    public GeoIpService(
        RestClient.Builder restClientBuilder,
        @Value("${app.geoip.database-path:}") String databasePath,
        @Value("${app.geoip.http-fallback-enabled:true}") boolean httpFallbackEnabled
    ) {
        this.databasePath = databasePath == null ? "" : databasePath.trim();
        this.httpFallbackEnabled = httpFallbackEnabled;
        this.restClient = restClientBuilder
            .defaultHeader("User-Agent", "Vibely/1.0 security-login")
            .build();
    }

    public LocationInfo resolve(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank() || isPrivateIp(ipAddress)) {
            return LocationInfo.unknown();
        }

        LocationInfo fromDatabase = resolveFromDatabase(ipAddress);
        if (isUseful(fromDatabase)) {
            return fromDatabase;
        }

        if (!httpFallbackEnabled) {
            return LocationInfo.unknown();
        }
        return resolveFromHttpApi(ipAddress);
    }

    private LocationInfo resolveFromDatabase(String ipAddress) {
        DatabaseReader databaseReader = reader();
        if (databaseReader == null) {
            return LocationInfo.unknown();
        }
        try {
            CityResponse response = databaseReader.city(InetAddress.getByName(ipAddress));
            return new LocationInfo(
                safe(response.getCountry().getName()),
                safe(response.getMostSpecificSubdivision().getName()),
                safe(response.getCity().getName()),
                null,
                null
            );
        } catch (IOException | GeoIp2Exception ex) {
            log.debug("GeoIP database lookup failed for {}: {}", ipAddress, ex.toString());
            return LocationInfo.unknown();
        }
    }

    /**
     * Free HTTPS lookup (ipapi.co). Used when MaxMind DB is missing on the VPS.
     */
    private LocationInfo resolveFromHttpApi(String ipAddress) {
        URI uri = UriComponentsBuilder
            .fromUriString("https://ipapi.co/" + ipAddress + "/json/")
            .build(true)
            .toUri();
        try {
            JsonNode body = restClient.get()
                .uri(uri)
                .retrieve()
                .body(JsonNode.class);
            if (body == null || body.path("error").asBoolean(false)) {
                log.debug("GeoIP HTTP fallback rejected for {}: {}", ipAddress, body);
                return LocationInfo.unknown();
            }
            LocationInfo info = new LocationInfo(
                text(body, "country_name"),
                text(body, "region"),
                text(body, "city"),
                null,
                null
            );
            if (!isUseful(info)) {
                return LocationInfo.unknown();
            }
            return info;
        } catch (RuntimeException ex) {
            log.warn("GeoIP HTTP fallback failed for {}: {}", ipAddress, ex.toString());
            return LocationInfo.unknown();
        }
    }

    private DatabaseReader reader() {
        if (reader != null) {
            return reader;
        }
        if (databasePath.isBlank()) {
            return null;
        }
        synchronized (this) {
            if (reader != null) {
                return reader;
            }
            File database = new File(databasePath);
            if (!database.isFile()) {
                log.warn("GeoIP database not found at {}", databasePath);
                return null;
            }
            try {
                reader = new DatabaseReader.Builder(database).build();
            } catch (IOException ex) {
                log.warn("Cannot open GeoIP database at {}", databasePath, ex);
            }
            return reader;
        }
    }

    private boolean isUseful(LocationInfo info) {
        if (info == null) {
            return false;
        }
        return hasText(info.city())
            || hasText(info.province())
            || (hasText(info.country()) && !"Không xác định".equalsIgnoreCase(info.country()));
    }

    private boolean isPrivateIp(String ip) {
        String value = ip.trim().toLowerCase();
        if (value.startsWith("::ffff:")) {
            value = value.substring("::ffff:".length());
        }
        return value.startsWith("10.")
            || value.startsWith("127.")
            || value.startsWith("169.254.")
            || value.startsWith("172.16.")
            || value.startsWith("172.17.")
            || value.startsWith("172.18.")
            || value.startsWith("172.19.")
            || value.startsWith("172.2")
            || value.startsWith("172.30.")
            || value.startsWith("172.31.")
            || value.startsWith("192.168.")
            || value.startsWith("fc")
            || value.startsWith("fd")
            || value.startsWith("fe80:")
            || "0:0:0:0:0:0:0:1".equals(value)
            || "::1".equals(value)
            || "localhost".equals(value);
    }

    private String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        return safe(node.path(field).asText(null));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
