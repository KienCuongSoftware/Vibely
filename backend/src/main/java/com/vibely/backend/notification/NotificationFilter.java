package com.vibely.backend.notification;

import com.vibely.backend.common.BadRequestException;
import java.util.List;

public enum NotificationFilter {
    all,
    likes,
    comments,
    mentions,
    followers;

    public List<NotificationType> toTypes() {
        return switch (this) {
            case all -> List.of();
            case likes -> List.of(NotificationType.VIDEO_LIKE, NotificationType.COMMENT_LIKE);
            case comments -> List.of(NotificationType.COMMENT_REPLY, NotificationType.COMMENT_LIKE);
            case mentions -> List.of(NotificationType.MENTION);
            case followers -> List.of(NotificationType.FOLLOW);
        };
    }

    public static NotificationFilter parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return all;
        }
        try {
            return NotificationFilter.valueOf(raw.trim().toLowerCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Bộ lọc thông báo không hợp lệ.");
        }
    }
}
