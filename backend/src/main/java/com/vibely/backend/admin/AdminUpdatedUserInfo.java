package com.vibely.backend.admin;

public record AdminUpdatedUserInfo(
    Long id,
    String email,
    String displayName,
    String oldUsername,
    String newUsername,
    boolean usernameChanged,
    boolean passwordChanged,
    String preferredLocale
) {
    public boolean hasNotifiableChanges() {
        return usernameChanged || passwordChanged;
    }
}
