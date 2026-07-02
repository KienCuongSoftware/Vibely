package com.vibely.backend.admin;

import com.vibely.backend.user.entity.User;

public record AdminUserUpdateResult(
    User user,
    AdminUpdatedUserInfo notification
) {
}
