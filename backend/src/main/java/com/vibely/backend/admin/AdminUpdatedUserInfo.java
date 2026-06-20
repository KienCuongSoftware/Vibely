package com.vibely.backend.admin;

public record AdminUpdatedUserInfo(
    Long id,
    String email,
    String displayName,
    String oldUsername,
    String newUsername,
    boolean usernameChanged,
    boolean passwordChanged
) {
    public boolean hasNotifiableChanges() {
        return usernameChanged || passwordChanged;
    }
}
