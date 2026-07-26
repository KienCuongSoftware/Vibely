package com.vibely.backend.user.dto;

import java.util.List;

public record CreateDataExportRequest(
    String format,
    List<String> categories
) {
}
