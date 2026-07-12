package com.vibely.backend.auth.service;

import com.vibely.backend.admin.AdminBanAppealPageResponse;
import com.vibely.backend.admin.AdminBanAppealResponse;
import com.vibely.backend.admin.AdminUpdateBanAppealStatusRequest;
import com.vibely.backend.auth.dto.BanAppealRequest;
import com.vibely.backend.auth.entity.BanAppeal;
import com.vibely.backend.auth.entity.BanAppealStatus;
import com.vibely.backend.auth.mail.AccountBanAppealEmailService;
import com.vibely.backend.auth.mail.EmailMasking;
import com.vibely.backend.auth.repository.BanAppealRepository;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import com.vibely.backend.common.SqlSafe;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class BanAppealService {

    private final BanAppealRepository banAppealRepository;
    private final UserRepository userRepository;
    private final AccountBanAppealEmailService accountBanAppealEmailService;

    public BanAppealService(
        BanAppealRepository banAppealRepository,
        UserRepository userRepository,
        AccountBanAppealEmailService accountBanAppealEmailService
    ) {
        this.banAppealRepository = banAppealRepository;
        this.userRepository = userRepository;
        this.accountBanAppealEmailService = accountBanAppealEmailService;
    }

    @Transactional
    public BanAppeal submit(BanAppealRequest request) {
        BanAppeal appeal = new BanAppeal();
        appeal.setContactEmail(normalizeEmail(request.email()));
        appeal.setDescription(request.description().trim());
        appeal.setBanReason(trimToNull(request.banReason()));
        appeal.setMaskedAccountEmail(trimToNull(request.maskedAccountEmail()));
        appeal.setStatus(BanAppealStatus.PENDING);
        resolveLinkedUser(appeal, request);
        BanAppeal saved = banAppealRepository.save(appeal);
        accountBanAppealEmailService.sendAppeal(request, saved.getId());
        return saved;
    }

    public AdminBanAppealPageResponse listForAdmin(int page, int size, BanAppealStatus status) {
        int safePage = SqlSafe.clampPage(page);
        int safeSize = SqlSafe.clampPageSize(size, 1, 100);
        PageRequest pageable = SqlSafe.pageRequest(
            safePage,
            safeSize,
            100,
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<BanAppeal> appeals = status == null
            ? banAppealRepository.findAll(pageable)
            : banAppealRepository.findByStatus(status, pageable);
        Map<Long, User> usersById = loadUsers(appeals.getContent());
        List<AdminBanAppealResponse> items = appeals.getContent().stream()
            .map(appeal -> toAdminResponse(appeal, usersById.get(appeal.getUserId())))
            .toList();
        return new AdminBanAppealPageResponse(
            items,
            appeals.getTotalElements(),
            appeals.getNumber(),
            appeals.getSize(),
            appeals.hasNext()
        );
    }

    public AdminBanAppealResponse getForAdmin(Long id) {
        BanAppeal appeal = banAppealRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy khiếu nại"));
        User user = appeal.getUserId() == null
            ? null
            : userRepository.findById(appeal.getUserId()).orElse(null);
        return toAdminResponse(appeal, user);
    }

    @Transactional
    public AdminBanAppealResponse updateStatus(
        Long id,
        AdminUpdateBanAppealStatusRequest request,
        Long adminUserId
    ) {
        BanAppeal appeal = banAppealRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy khiếu nại"));
        BanAppealStatus previousStatus = appeal.getStatus();
        BanAppealStatus nextStatus = request.status();

        appeal.setStatus(nextStatus);
        appeal.setAdminNotes(trimToNull(request.adminNotes()));
        appeal.setReviewedByAdminId(adminUserId);
        appeal.setReviewedAt(LocalDateTime.now());
        BanAppeal saved = banAppealRepository.save(appeal);

        User user = resolveLinkedUserEntity(saved);
        if (nextStatus == BanAppealStatus.APPROVED) {
            user = unbanLinkedUserIfNeeded(saved, user);
        }

        if (previousStatus != nextStatus) {
            accountBanAppealEmailService.sendAppealDecision(saved);
        }

        return toAdminResponse(saved, user);
    }

    private User resolveLinkedUserEntity(BanAppeal appeal) {
        if (appeal.getUserId() != null) {
            return userRepository.findById(appeal.getUserId()).orElse(null);
        }
        return userRepository.findByEmail(normalizeEmail(appeal.getContactEmail())).orElse(null);
    }

    private User unbanLinkedUserIfNeeded(BanAppeal appeal, User user) {
        User target = user;
        if (target == null) {
            target = resolveLinkedUserEntity(appeal);
        }
        if (target == null || !target.isBanned()) {
            return target;
        }
        target.setAccountStatus(UserAccountStatus.ACTIVE);
        target.setBanReason(null);
        target.setBannedAt(null);
        target.setBannedByAdminId(null);
        User savedUser = userRepository.save(target);
        if (appeal.getUserId() == null) {
            appeal.setUserId(savedUser.getId());
            banAppealRepository.save(appeal);
        }
        return savedUser;
    }

    private void resolveLinkedUser(BanAppeal appeal, BanAppealRequest request) {
        userRepository.findByEmail(normalizeEmail(request.email()))
            .filter(user -> user.getAccountStatus() == UserAccountStatus.BANNED)
            .ifPresent(user -> appeal.setUserId(user.getId()));

        if (appeal.getUserId() != null || !StringUtils.hasText(request.maskedAccountEmail())) {
            return;
        }

        String masked = request.maskedAccountEmail().trim();
        Page<User> bannedUsers = userRepository.findByAccountStatusOrderByBannedAtDesc(
            UserAccountStatus.BANNED,
            PageRequest.of(0, 200)
        );
        for (User user : bannedUsers.getContent()) {
            if (EmailMasking.mask(user.getEmail()).equalsIgnoreCase(masked)) {
                appeal.setUserId(user.getId());
                break;
            }
        }
    }

    private Map<Long, User> loadUsers(List<BanAppeal> appeals) {
        List<Long> userIds = appeals.stream()
            .map(BanAppeal::getUserId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, User> usersById = new HashMap<>();
        userRepository.findAllById(userIds).forEach(user -> usersById.put(user.getId(), user));
        return usersById;
    }

    private AdminBanAppealResponse toAdminResponse(BanAppeal appeal, User user) {
        return new AdminBanAppealResponse(
            appeal.getId(),
            appeal.getContactEmail(),
            appeal.getDescription(),
            appeal.getBanReason(),
            appeal.getMaskedAccountEmail(),
            appeal.getUserId(),
            user == null ? null : user.getUsername(),
            user == null ? null : user.getDisplayName(),
            appeal.getStatus().name(),
            appeal.getAdminNotes(),
            appeal.getReviewedByAdminId(),
            appeal.getReviewedAt(),
            appeal.getCreatedAt()
        );
    }

    private static String normalizeEmail(String email) {
        String normalized = String.valueOf(email == null ? "" : email).trim().toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalized)) {
            throw new BadRequestException("Email là bắt buộc");
        }
        return normalized;
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
