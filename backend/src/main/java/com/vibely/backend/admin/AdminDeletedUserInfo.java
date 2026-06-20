package com.vibely.backend.admin;

public record AdminDeletedUserInfo(
    Long id,
    String username,
    String displayName,
    String email
) {
}
