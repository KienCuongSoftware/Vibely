package com.vibely.backend.live.dto;

import java.time.LocalDateTime;

public record LiveModeratorResponse(LiveUserResponse user, LocalDateTime createdAt) {}
