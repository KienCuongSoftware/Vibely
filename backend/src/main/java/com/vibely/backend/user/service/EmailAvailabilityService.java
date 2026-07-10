package com.vibely.backend.user.service;

import com.vibely.backend.user.dto.EmailCheckResponse;
import com.vibely.backend.user.repository.UserRepository;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class EmailAvailabilityService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;
    private final UserExistenceBloomFilterService bloomFilterService;

    public EmailAvailabilityService(
        UserRepository userRepository,
        UserExistenceBloomFilterService bloomFilterService
    ) {
        this.userRepository = userRepository;
        this.bloomFilterService = bloomFilterService;
    }

    public EmailCheckResponse checkAvailability(String rawEmail) {
        return checkAvailability(rawEmail, false);
    }

    public EmailCheckResponse checkAvailability(String rawEmail, boolean confirm) {
        String normalized = normalizeEmail(rawEmail);
        if (normalized.isBlank()) {
            return new EmailCheckResponse(false, "", "Vui lòng nhập email");
        }
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            return new EmailCheckResponse(false, normalized, "Email không hợp lệ");
        }

        boolean bloomHint = bloomFilterService.mightContainEmail(normalized);
        boolean available = !userRepository.existsByEmail(normalized);

        if (available) {
            String message = confirm
                ? "Email có thể sử dụng (đã xác minh lại với cơ sở dữ liệu)"
                : "Email có thể sử dụng";
            return new EmailCheckResponse(available, normalized, message, bloomHint, false);
        }

        String message = confirm
            ? "Email đã được sử dụng (đã xác minh lại với cơ sở dữ liệu)"
            : bloomHint
                ? "Email có thể đã được sử dụng. Nhấn Kiểm tra lại để xác minh chính xác."
                : "Email đã được sử dụng";
        return new EmailCheckResponse(false, normalized, message, bloomHint, !confirm);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
