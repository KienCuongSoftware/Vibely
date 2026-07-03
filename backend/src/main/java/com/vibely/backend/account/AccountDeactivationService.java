package com.vibely.backend.account;

import com.vibely.backend.auth.service.OtpVerificationService;
import com.vibely.backend.auth.repository.RefreshTokenRepository;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountDeactivationService {

    private final UserRepository userRepository;
    private final OtpVerificationService otpVerificationService;
    private final RefreshTokenRepository refreshTokenRepository;

    public AccountDeactivationService(
        UserRepository userRepository,
        OtpVerificationService otpVerificationService,
        RefreshTokenRepository refreshTokenRepository
    ) {
        this.userRepository = userRepository;
        this.otpVerificationService = otpVerificationService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public void deactivate(String email, String code) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));
        if (!user.isActive()) {
            throw new BadRequestException("Tài khoản đã bị hủy kích hoạt");
        }

        otpVerificationService.consumeAccountDeactivationCode(user.getEmail(), code);
        user.setAccountStatus(UserAccountStatus.DEACTIVATED);
        user.setDeactivatedAt(LocalDateTime.now());
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(user.getId());
    }
}
