package com.vibely.backend.admin;

import com.vibely.backend.auth.entity.BanAppealStatus;
import com.vibely.backend.auth.service.BanAppealService;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
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
@RequestMapping("/api/admin/ban-appeals")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBanAppealController {

    private final BanAppealService banAppealService;
    private final UserRepository userRepository;

    public AdminBanAppealController(BanAppealService banAppealService, UserRepository userRepository) {
        this.banAppealService = banAppealService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<AdminBanAppealPageResponse> listBanAppeals(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) BanAppealStatus status
    ) {
        return ApiResponse.success(banAppealService.listForAdmin(page, size, status));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminBanAppealResponse> getBanAppeal(@PathVariable Long id) {
        return ApiResponse.success(banAppealService.getForAdmin(id));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminBanAppealResponse> updateBanAppealStatus(
        @PathVariable Long id,
        @Valid @RequestBody AdminUpdateBanAppealStatusRequest request,
        Authentication authentication
    ) {
        Long adminUserId = userRepository.findByEmail(authentication.getName())
            .map(User::getId)
            .orElse(null);
        return ApiResponse.success(banAppealService.updateStatus(id, request, adminUserId));
    }
}
