package com.vibely.backend.account;

import com.vibely.backend.auth.service.OtpVerificationService;
import com.vibely.backend.auth.repository.RefreshTokenRepository;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final OtpVerificationService otpVerificationService;
    private final RefreshTokenRepository refreshTokenRepository;

    public AccountDeletionService(
        UserRepository userRepository,
        OtpVerificationService otpVerificationService,
        RefreshTokenRepository refreshTokenRepository
    ) {
        this.userRepository = userRepository;
        this.otpVerificationService = otpVerificationService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public void deletePermanently(String email, String code) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));

        otpVerificationService.consumeAccountDeletionCode(user.getEmail(), code);
        refreshTokenRepository.revokeAllByUserId(user.getId());
        userRepository.delete(user);
    }
}
