package com.vibely.backend.notification;

import java.util.List;

public record NotificationReadBatchRequest(List<Long> ids) {
}
