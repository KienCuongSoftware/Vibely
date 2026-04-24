package com.vibely.backend.health;

import com.vibely.backend.common.ApiResponse;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(Map.of("status", "ok", "service", "vibely-backend"));
    }

    @GetMapping("/readiness")
    public ApiResponse<Map<String, String>> readiness() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            return ApiResponse.success(Map.of("status", valid ? "ready" : "not-ready", "db", "connected"));
        }
    }
}
