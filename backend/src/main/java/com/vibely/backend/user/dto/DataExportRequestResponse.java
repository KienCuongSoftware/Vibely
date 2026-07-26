package com.vibely.backend.user.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DataExportRequestResponse(
    Long id,
    String format,
    List<String> categories,
    String status,
    LocalDateTime createdAt,
    LocalDateTime cancelledAt
) {
}
