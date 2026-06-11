package com.vibely.backend.notification;

import com.vibely.backend.common.BadRequestException;

public enum SystemNotificationFilter {
    all,
    live,
    transaction,
    system;

    public SystemNotificationCategory toCategory() {
        return switch (this) {
            case all -> null;
            case live -> SystemNotificationCategory.live;
            case transaction -> SystemNotificationCategory.transaction;
            case system -> SystemNotificationCategory.system;
        };
    }

    public static SystemNotificationFilter parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return all;
        }
        try {
            return SystemNotificationFilter.valueOf(raw.trim().toLowerCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Bộ lọc thông báo hệ thống không hợp lệ.");
        }
    }
}
