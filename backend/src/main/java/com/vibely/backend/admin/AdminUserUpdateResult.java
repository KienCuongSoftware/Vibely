package com.vibely.backend.admin;

import com.vibely.backend.user.User;

public record AdminUserUpdateResult(
    User user,
    AdminUpdatedUserInfo notification
) {
}
