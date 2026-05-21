package com.vibely.backend.share.dto;

import jakarta.validation.constraints.Size;

public record ShareVideoRequest(
    @Size(max = 32)
    String channel,
    @Size(max = 2048)
    String referrer,
    @Size(max = 64)
    String idempotencyKey
) {}
