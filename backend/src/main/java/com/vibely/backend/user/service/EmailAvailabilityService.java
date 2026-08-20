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
            return new EmailCheckResponse(false, "", "Please enter an email");
        }
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            return new EmailCheckResponse(false, normalized, "Invalid email");
        }

        boolean bloomHint = bloomFilterService.mightContainEmail(normalized);
        boolean available = !userRepository.existsByEmail(normalized);

        if (available) {
            String message = confirm
                ? "Email is available (re-verified against the database)"
                : "Email is available";
            return new EmailCheckResponse(available, normalized, message, bloomHint, false);
        }

        String message = confirm
            ? "Email is already in use (re-verified against the database)"
            : bloomHint
                ? "Email may already be in use. Tap Check again to verify."
                : "Email is already in use";
        return new EmailCheckResponse(false, normalized, message, bloomHint, !confirm);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
