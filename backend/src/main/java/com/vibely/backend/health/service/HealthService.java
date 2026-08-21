package com.vibely.backend.health.service;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    private final DataSource dataSource;
    private final boolean oauth2Enabled;

    public HealthService(
        DataSource dataSource,
        @Value("${app.oauth2.enabled:true}") boolean oauth2Enabled
    ) {
        this.dataSource = dataSource;
        this.oauth2Enabled = oauth2Enabled;
    }

    public Map<String, String> healthStatus() {
        Map<String, String> status = new LinkedHashMap<>();
        status.put("service", "vibely-backend");
        status.put("status", "ok");
        status.put("oauth2Enabled", Boolean.toString(oauth2Enabled));
        return status;
    }

    public Map<String, String> readinessStatus() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            return Map.of("status", valid ? "ready" : "not-ready", "db", "connected");
        }
    }
}
