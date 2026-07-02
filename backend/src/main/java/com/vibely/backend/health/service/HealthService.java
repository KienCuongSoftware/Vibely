package com.vibely.backend.health.service;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    private final DataSource dataSource;

    public HealthService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Map<String, String> healthStatus() {
        return Map.of("status", "ok", "service", "vibely-backend");
    }

    public Map<String, String> readinessStatus() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            return Map.of("status", valid ? "ready" : "not-ready", "db", "connected");
        }
    }
}
