package com.vibely.backend.auth.context;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.GeoIp2Exception;
import com.maxmind.geoip2.model.CityResponse;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeoIpService {

    private static final Logger log = LoggerFactory.getLogger(GeoIpService.class);

    private final String databasePath;
    private volatile DatabaseReader reader;

    public GeoIpService(@Value("${app.geoip.database-path:}") String databasePath) {
        this.databasePath = databasePath == null ? "" : databasePath.trim();
    }

    public LocationInfo resolve(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank() || isPrivateIp(ipAddress)) {
            return LocationInfo.unknown();
        }
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

    private boolean isPrivateIp(String ip) {
        return ip.startsWith("10.")
            || ip.startsWith("127.")
            || ip.startsWith("172.16.")
            || ip.startsWith("172.17.")
            || ip.startsWith("172.18.")
            || ip.startsWith("172.19.")
            || ip.startsWith("172.2")
            || ip.startsWith("172.30.")
            || ip.startsWith("172.31.")
            || ip.startsWith("192.168.")
            || "0:0:0:0:0:0:0:1".equals(ip)
            || "::1".equals(ip);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
