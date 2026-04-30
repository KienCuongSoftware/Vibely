package com.vibely.backend.user;

import com.vibely.backend.common.BadRequestException;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class UsernameService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9._]{4,24}$");
    private static final Pattern GOOGLE_USERNAME_PATTERN = Pattern.compile("^[a-z0-9]{4,24}$");
    private final UserRepository userRepository;

    public UsernameService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String normalize(String rawUsername) {
        if (rawUsername == null) {
            return "";
        }
        String normalized = rawUsername.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("@")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }

    public String validateForRegistration(String rawUsername) {
        String normalized = normalize(rawUsername);
        if (!USERNAME_PATTERN.matcher(normalized).matches()) {
            throw new BadRequestException("Vibely ID chỉ gồm chữ thường, số, dấu chấm và gạch dưới (4-24 ký tự)");
        }
        return normalized;
    }

    public UsernameCheckResponse checkAvailability(String rawUsername) {
        String normalized = normalize(rawUsername);
        if (normalized.isBlank()) {
            return new UsernameCheckResponse(false, "", "Vui lòng nhập Vibely ID", null);
        }
        if (!USERNAME_PATTERN.matcher(normalized).matches()) {
            return new UsernameCheckResponse(
                false,
                normalized,
                "Vibely ID chỉ gồm chữ thường, số, dấu chấm và gạch dưới (4-24 ký tự)",
                null
            );
        }
        boolean available = !userRepository.existsByUsername(normalized);
        return new UsernameCheckResponse(
            available,
            normalized,
            available ? "Vibely ID có thể sử dụng" : "Vibely ID đã tồn tại",
            available ? null : suggestAvailable(normalized)
        );
    }

    public String suggestAvailable(String seed) {
        String base = slugify(seed);
        if (base.isBlank()) {
            base = "vibely.user";
        }
        if (base.length() > 24) {
            base = base.substring(0, 24);
        }
        if (base.length() < 4) {
            base = (base + "user").substring(0, 4);
        }
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            String tail = "." + suffix++;
            int prefixLimit = Math.max(1, 24 - tail.length());
            String prefix = base.substring(0, Math.min(base.length(), prefixLimit));
            candidate = prefix + tail;
        }
        return candidate;
    }

    public String generateFromDisplayNameOrEmail(String displayName, String email) {
        String seed = (displayName != null && !displayName.isBlank())
            ? displayName
            : (email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : UUID.randomUUID().toString());
        return suggestAvailable(seed);
    }

    /**
     * Generate Vibely ID for Google users using the email local-part:
     * - remove diacritics (Tiếng Việt)
     * - lowercase
     * - remove all non a-z0-9 characters (e.g. '.' ',' spaces, etc.)
     * - ensure uniqueness (4-24 chars) by appending numeric suffix.
     */
    public String generateFromGoogleEmail(String email) {
        return generateFromGoogleEmail(email, null);
    }

    public String generateFromGoogleEmail(String email, String currentUsername) {
        if (email == null || email.isBlank()) {
            return suggestAvailable(currentUsername != null && !currentUsername.isBlank()
                ? currentUsername
                : "vibely.user");
        }

        String localPart = email.trim();
        if (localPart.contains("@")) {
            localPart = localPart.substring(0, localPart.indexOf('@'));
        }

        String normalized = Normalizer.normalize(localPart, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");

        String base = normalized
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]", "");

        if (base.isBlank()) {
            base = "vibelyuser";
        }

        while (base.length() < 4) {
            base = (base + "user");
        }
        if (base.length() > 24) {
            base = base.substring(0, 24);
        }

        String candidate = base;
        if (currentUsername != null && !currentUsername.isBlank() && candidate.equals(currentUsername)) {
            return candidate;
        }

        int suffix = 1;
        while (userRepository.existsByUsername(candidate) && (currentUsername == null || !candidate.equals(currentUsername))) {
            String suffixStr = String.valueOf(suffix++);
            int maxBaseLen = Math.max(1, 24 - suffixStr.length());
            String prefix = base.substring(0, Math.min(base.length(), maxBaseLen));
            candidate = prefix + suffixStr;
        }

        return candidate;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        String slug = normalized
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9._]", ".")
            .replaceAll("\\.+", ".")
            .replaceAll("^\\.|\\.$", "");
        return slug;
    }
}
