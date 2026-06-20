package com.vibely.backend.admin;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.Role;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.user.UsernameService;
import java.util.Locale;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final UsernameService usernameService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public AdminUserService(
        UserRepository userRepository,
        UsernameService usernameService,
        PasswordEncoder passwordEncoder,
        JdbcTemplate jdbcTemplate
    ) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public User createUser(AdminCreateUserRequest request) {
        String email = normalizeEmail(request.email());
        String username = usernameService.validateForRegistration(request.username());
        Role role = parseRole(request.role());

        ensureEmailAvailable(email, null);
        ensureUsernameAvailable(username, null);

        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setDisplayName(normalizeDisplayName(request.displayName()));
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setOnboardingCompleted(true);
        return userRepository.save(user);
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

    private void cleanupRowsThatWouldOtherwiseRemain(Long userId) {
        jdbcTemplate.update("DELETE FROM video_shares WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM short_links WHERE created_by_user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM anti_bot_device_fingerprints WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM anti_bot_risk_events WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM anti_bot_abuse_reports WHERE reporter_user_id = ?", userId);
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
