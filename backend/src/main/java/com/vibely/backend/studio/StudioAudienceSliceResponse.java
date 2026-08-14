package com.vibely.backend.studio;

/** Một phần trong nhóm khán giả (khu vực, độ tuổi…). */
public record StudioAudienceSliceResponse(
    String id,
    String label,
    long count,
    double percent
) {}
