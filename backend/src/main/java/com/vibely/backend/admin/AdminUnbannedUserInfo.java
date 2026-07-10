package com.vibely.backend.admin;

public record AdminUnbannedUserInfo(
    Long id,
    String username,
    String displayName,
    String email
) {
}
