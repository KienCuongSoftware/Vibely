package com.vibely.backend.live.dto;

import java.time.LocalDateTime;

public record LiveRestrictionResponse(Long userId, String type, LocalDateTime expiresAt) {}
