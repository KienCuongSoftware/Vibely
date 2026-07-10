package com.vibely.backend.admin;

import com.vibely.backend.user.entity.User;

public record AdminUnbanResult(
    User user,
    AdminUnbannedUserInfo notification
) {
}
