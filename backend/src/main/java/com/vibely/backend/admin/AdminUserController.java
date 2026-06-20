package com.vibely.backend.admin;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

    private final UserRepository userRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final AdminUserService adminUserService;
    private final AdminAccountDeletionEmailService accountDeletionEmailService;

    public AdminUserController(
        UserRepository userRepository,
        UserAvatarResolver userAvatarResolver,
        AdminUserService adminUserService,
        AdminAccountDeletionEmailService accountDeletionEmailService
    ) {
        this.userRepository = userRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.adminUserService = adminUserService;
        this.accountDeletionEmailService = accountDeletionEmailService;
    }

    @GetMapping
    public ApiResponse<AdminUserPageResponse> listUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<User> users = userRepository.findAll(
            PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
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
        return ApiResponse.success(toResponse(adminUserService.updateUser(id, request)));
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
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
