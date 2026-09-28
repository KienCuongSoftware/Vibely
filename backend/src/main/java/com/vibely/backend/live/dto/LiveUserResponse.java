package com.vibely.backend.live.dto;

/** Public profile fields only; never email or account details. */
public record LiveUserResponse(Long id, String username, String displayName, String avatarUrl) {}
