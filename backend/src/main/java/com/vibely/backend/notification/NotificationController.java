package com.vibely.backend.notification;

import com.vibely.backend.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasRole('USER')")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<NotificationPageResponse> getNotifications(
        Authentication authentication,
        @RequestParam(required = false) String filter,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
            notificationService.getInbox(
                authentication.getName(),
                NotificationFilter.parse(filter),
                cursor,
                size
            )
        );
    }

    @GetMapping("/system")
    public ApiResponse<SystemNotificationPageResponse> getSystemNotifications(
        @RequestParam(required = false) String filter,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
            notificationService.getSystemInbox(
                SystemNotificationFilter.parse(filter),
                cursor,
                size
            )
        );
    }

    @GetMapping("/unread-count")
    public ApiResponse<NotificationUnreadCountResponse> getUnreadCount(Authentication authentication) {
        return ApiResponse.success(notificationService.getUnreadCount(authentication.getName()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
        Authentication authentication,
        @PathVariable Long id
    ) {
        notificationService.markRead(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/read")
    public ResponseEntity<ApiResponse<Void>> markReadBatch(
        Authentication authentication,
        @RequestBody NotificationReadBatchRequest body
    ) {
        notificationService.markReadBatch(authentication.getName(), body != null ? body.ids() : null);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
