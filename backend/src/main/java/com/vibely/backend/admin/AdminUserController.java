package com.vibely.backend.admin;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserAvatarResolver userAvatarResolver;
    private final AdminUserService adminUserService;
    private final AdminAccountDeletionEmailService accountDeletionEmailService;
    private final AdminAccountBanEmailService accountBanEmailService;

    public AdminUserController(
        UserAvatarResolver userAvatarResolver,
        AdminUserService adminUserService,
        AdminAccountDeletionEmailService accountDeletionEmailService,
        AdminAccountBanEmailService accountBanEmailService
    ) {
        this.userAvatarResolver = userAvatarResolver;
        this.adminUserService = adminUserService;
        this.accountDeletionEmailService = accountDeletionEmailService;
        this.accountBanEmailService = accountBanEmailService;
    }

    @GetMapping("/banned")
    public ApiResponse<AdminUserPageResponse> listBannedUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Page<User> users = adminUserService.listBannedUsers(page, size);
        return ApiResponse.success(
            new AdminUserPageResponse(
                users.getContent().stream().map(this::toResponse).toList(),
                users.getTotalElements(),
                users.getNumber(),
                users.getSize(),
                users.hasNext()
            )
        );
    }

    @PostMapping("/{id}/ban")
    public ApiResponse<AdminBannedUserInfo> banUser(
        @PathVariable Long id,
        @Valid @RequestBody AdminBanUserRequest request,
        Authentication authentication
    ) {
        AdminBannedUserInfo bannedUser = adminUserService.banUser(id, authentication.getName(), request.reason());
        accountBanEmailService.sendAccountBanned(bannedUser);
        return ApiResponse.success(bannedUser);
    }

    @PostMapping("/{id}/unban")
    public ApiResponse<AdminUserResponse> unbanUser(
        @PathVariable Long id,
        Authentication authentication
    ) {
        AdminUnbanResult result = adminUserService.unbanUser(id, authentication.getName());
        accountBanEmailService.sendAccountUnbanned(result.notification());
        return ApiResponse.success(toResponse(result.user()));
    }

    @GetMapping
    public ApiResponse<AdminUserPageResponse> listUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Page<User> users = adminUserService.listUsers(page, size);
        return ApiResponse.success(
            new AdminUserPageResponse(
                users.getContent().stream().map(this::toResponse).toList(),
                users.getTotalElements(),
                users.getNumber(),
                users.getSize(),
                users.hasNext()
            )
        );
    }

    @PostMapping
    public ApiResponse<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return ApiResponse.success(toResponse(adminUserService.createUser(request)));
    }

    @PutMapping("/{id}")
    public ApiResponse<AdminUserResponse> updateUser(
        @PathVariable Long id,
        @Valid @RequestBody AdminUpdateUserRequest request
    ) {
        AdminUserUpdateResult result = adminUserService.updateUser(id, request);
        accountDeletionEmailService.sendAccountUpdated(result.notification());
        return ApiResponse.success(toResponse(result.user()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<AdminDeletedUserInfo> deleteUser(@PathVariable Long id, Authentication authentication) {
        AdminDeletedUserInfo deletedUser = adminUserService.deleteUser(id, authentication.getName());
        accountDeletionEmailService.sendAccountDeleted(deletedUser);
        return ApiResponse.success(deletedUser);
    }

    private AdminUserResponse toResponse(User user) {
        return new AdminUserResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            user.getRole().name(),
            userAvatarResolver.resolve(user),
            user.isOnboardingCompleted(),
            user.getAccountStatus() != null ? user.getAccountStatus().name() : UserAccountStatus.ACTIVE.name(),
            com.vibely.backend.moderation.BanReasonFormatter.forDisplay(user.getBanReason()),
            user.getBannedAt(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
