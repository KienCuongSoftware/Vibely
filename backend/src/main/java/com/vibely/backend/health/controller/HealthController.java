package com.vibely.backend.health.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.health.service.HealthService;
import java.sql.SQLException;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(healthService.healthStatus());
    }

    @GetMapping("/readiness")
    public ApiResponse<Map<String, String>> readiness() throws SQLException {
        return ApiResponse.success(healthService.readinessStatus());
    }
}
