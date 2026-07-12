package com.vibely.backend.admin;

import com.vibely.backend.auth.repository.RefreshTokenRepository;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.BirthDateValidator;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.common.SqlSafe;
import com.vibely.backend.user.dto.UsernameCheckResponse;
import com.vibely.backend.user.entity.Role;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.user.service.EmailAvailabilityService;
import com.vibely.backend.user.service.UserExistenceBloomFilterService;
import com.vibely.backend.user.service.UsernameService;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final UsernameService usernameService;
    private final EmailAvailabilityService emailAvailabilityService;
    private final UserExistenceBloomFilterService bloomFilterService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final RefreshTokenRepository refreshTokenRepository;

    public AdminUserService(
        UserRepository userRepository,
        UsernameService usernameService,
        EmailAvailabilityService emailAvailabilityService,
        UserExistenceBloomFilterService bloomFilterService,
        PasswordEncoder passwordEncoder,
        JdbcTemplate jdbcTemplate,
        RefreshTokenRepository refreshTokenRepository
    ) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
        this.emailAvailabilityService = emailAvailabilityService;
        this.bloomFilterService = bloomFilterService;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public Page<User> listUsers(int page, int size) {
        PageRequest pageable = SqlSafe.pageRequest(
            page,
            size,
            100,
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return userRepository.findAll(pageable);
    }

    public Page<User> listBannedUsers(int page, int size) {
        return userRepository.findByAccountStatusOrderByBannedAtDesc(
            UserAccountStatus.BANNED,
            SqlSafe.pageRequest(page, size, 100)
        );
    }

    @Transactional
    public User createUser(AdminCreateUserRequest request) {
        String email = normalizeEmail(request.email());
        String username = usernameService.validateForRegistration(request.username());
        Role role = parseRole(request.role());

        if (!emailAvailabilityService.checkAvailability(email).available()) {
            throw new BadRequestException("Email đã được sử dụng");
        }
        UsernameCheckResponse usernameCheck = usernameService.checkAvailability(username);
        if (!usernameCheck.available()) {
            String suffix = usernameCheck.suggestion() != null ? " Gợi ý: @" + usernameCheck.suggestion() : "";
            throw new BadRequestException("Vibely ID đã tồn tại." + suffix);
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setDisplayName(normalizeDisplayName(request.displayName()));
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setBirthDate(BirthDateValidator.validate(request.birthDate()));
        user.setOnboardingCompleted(true);
        User saved = userRepository.save(user);
        bloomFilterService.registerUser(saved.getEmail(), saved.getUsername());
        return saved;
    }

    @Transactional
    public AdminUserUpdateResult updateUser(Long userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        String username = usernameService.validateForRegistration(request.username());
        Role role = parseRole(request.role());
        String oldUsername = user.getUsername();
        boolean passwordChanged = false;

        ensureUsernameAvailable(username, userId);

        user.setUsername(username);
        user.setDisplayName(normalizeDisplayName(request.displayName()));
        user.setRole(role);

        if (StringUtils.hasText(request.password())) {
            String password = request.password().trim();
            if (password.length() < 6 || password.length() > 100) {
                throw new BadRequestException("Mật khẩu phải từ 6 đến 100 ký tự");
            }
            user.setPasswordHash(passwordEncoder.encode(password));
            passwordChanged = true;
        }

        User saved = userRepository.save(user);
        boolean usernameChanged = !Objects.equals(oldUsername, saved.getUsername());
        if (usernameChanged) {
            bloomFilterService.registerUsername(saved.getUsername());
        }
        AdminUpdatedUserInfo notification = new AdminUpdatedUserInfo(
            saved.getId(),
            saved.getEmail(),
            saved.getDisplayName(),
            oldUsername,
            saved.getUsername(),
            usernameChanged,
            passwordChanged
        );
        return new AdminUserUpdateResult(saved, notification);
    }

    @Transactional
    public AdminDeletedUserInfo deleteUser(Long targetUserId, String adminEmail) {
        User admin = userRepository.findByEmail(normalizeEmail(adminEmail))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản quản trị viên"));
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        if (Objects.equals(admin.getId(), target.getId())) {
            throw new BadRequestException("Không thể xóa chính tài khoản đang đăng nhập");
        }
        if (target.getRole() == Role.ADMIN) {
            throw new BadRequestException("Không thể xóa tài khoản ADMIN từ trang này");
        }

        AdminDeletedUserInfo deletedUser = new AdminDeletedUserInfo(
            target.getId(),
            target.getUsername(),
            target.getDisplayName(),
            target.getEmail()
        );

        cleanupRowsThatWouldOtherwiseRemain(target.getId());
        int deleted = jdbcTemplate.update("DELETE FROM users WHERE id = ?", target.getId());
        if (deleted == 0) {
            throw new NotFoundException("Không tìm thấy người dùng");
        }
        cleanupOrphanedChatConversations();
        return deletedUser;
    }

    @Transactional
    public AdminBannedUserInfo banUser(Long targetUserId, String adminEmail, String reason) {
        User admin = userRepository.findByEmail(normalizeEmail(adminEmail))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản quản trị viên"));
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        if (Objects.equals(admin.getId(), target.getId())) {
            throw new BadRequestException("Không thể cấm chính tài khoản đang đăng nhập");
        }
        if (target.getRole() == Role.ADMIN) {
            throw new BadRequestException("Không thể cấm tài khoản ADMIN");
        }
        if (target.isBanned()) {
            throw new BadRequestException("Tài khoản này đã bị cấm");
        }

        String normalizedReason = normalizeBanReason(reason);
        target.setAccountStatus(UserAccountStatus.BANNED);
        target.setBanReason(normalizedReason);
        target.setBannedAt(LocalDateTime.now());
        target.setBannedByAdminId(admin.getId());
        target.setDeactivatedAt(null);
        userRepository.save(target);
        refreshTokenRepository.revokeAllByUserId(target.getId());

        return toBannedUserInfo(target);
    }

    @Transactional
    public AdminUnbanResult unbanUser(Long targetUserId, String adminEmail) {
        userRepository.findByEmail(normalizeEmail(adminEmail))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản quản trị viên"));
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        if (!target.isBanned()) {
            throw new BadRequestException("Tài khoản này hiện không bị cấm");
        }

        AdminUnbannedUserInfo notification = toUnbannedUserInfo(target);
        target.setAccountStatus(UserAccountStatus.ACTIVE);
        target.setBanReason(null);
        target.setBannedAt(null);
        target.setBannedByAdminId(null);
        return new AdminUnbanResult(userRepository.save(target), notification);
    }

    public AdminUnbannedUserInfo toUnbannedUserInfo(User user) {
        return new AdminUnbannedUserInfo(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail()
        );
    }

    public AdminBannedUserInfo toBannedUserInfo(User user) {
        return new AdminBannedUserInfo(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            user.getBanReason(),
            user.getBannedAt()
        );
    }

    private String normalizeBanReason(String reason) {
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Lý do cấm tài khoản là bắt buộc");
        }
        String trimmed = reason.trim();
        if (trimmed.length() < 5 || trimmed.length() > 500) {
            throw new BadRequestException("Lý do cấm phải từ 5 đến 500 ký tự");
        }
        return trimmed;
    }

    private void cleanupRowsThatWouldOtherwiseRemain(Long userId) {
        jdbcTemplate.update("DELETE FROM video_shares WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM short_links WHERE created_by_user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM anti_bot_device_fingerprints WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM anti_bot_risk_events WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM anti_bot_abuse_reports WHERE reporter_user_id = ?", userId);
        // ban_appeals.user_id historically had no ON DELETE; unlink before removing the user.
        jdbcTemplate.update("UPDATE ban_appeals SET user_id = NULL WHERE user_id = ?", userId);
    }

    private void cleanupOrphanedChatConversations() {
        jdbcTemplate.update("""
            DELETE FROM chat_conversations c
            WHERE NOT EXISTS (
                SELECT 1
                FROM chat_conversation_participants p
                WHERE p.conversation_id = c.id
            )
            """);
    }

    private void ensureEmailAvailable(String email, Long currentUserId) {
        userRepository.findByEmail(email)
            .filter(existing -> !Objects.equals(existing.getId(), currentUserId))
            .ifPresent(existing -> {
                throw new BadRequestException("Email đã được sử dụng");
            });
    }

    private void ensureUsernameAvailable(String username, Long currentUserId) {
        userRepository.findByUsername(username)
            .filter(existing -> !Objects.equals(existing.getId(), currentUserId))
            .ifPresent(existing -> {
                throw new BadRequestException("Vibely ID đã tồn tại");
            });
    }

    private String normalizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeDisplayName(String displayName) {
        if (!StringUtils.hasText(displayName)) {
            throw new BadRequestException("Tên hiển thị là bắt buộc");
        }
        return displayName.trim();
    }

    private Role parseRole(String rawRole) {
        try {
            return Role.valueOf(rawRole.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Vai trò không hợp lệ");
        }
    }
}
