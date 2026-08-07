package com.vibely.backend.interaction.service;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.entity.ProfileViewEntity;
import com.vibely.backend.interaction.repository.ProfileViewRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.user.service.UsernameService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProfileViewService {

    private final ProfileViewRepository profileViewRepository;
    private final UserRepository userRepository;
    private final UsernameService usernameService;

    public ProfileViewService(
        ProfileViewRepository profileViewRepository,
        UserRepository userRepository,
        UsernameService usernameService
    ) {
        this.profileViewRepository = profileViewRepository;
        this.userRepository = userRepository;
        this.usernameService = usernameService;
    }

    @Transactional
    public boolean recordView(String username, String viewerEmail, String clientViewerKey, String clientIp) {
        String normalized = usernameService.normalize(username);
        User profile = userRepository.findByUsername(normalized)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        User viewer = null;
        if (StringUtils.hasText(viewerEmail)) {
            viewer = userRepository.findByEmail(viewerEmail).orElse(null);
            if (viewer != null && viewer.getId().equals(profile.getId())) {
                return false;
            }
        }

        String viewerKey = buildViewerKey(viewer, clientViewerKey, clientIp);
        LocalDateTime since = LocalDate.now().atStartOfDay();
        if (profileViewRepository.existsByProfileUser_IdAndViewerKeyAndCreatedAtGreaterThanEqual(
            profile.getId(), viewerKey, since
        )) {
            return false;
        }

        ProfileViewEntity row = new ProfileViewEntity();
        row.setProfileUser(profile);
        row.setViewerUser(viewer);
        row.setViewerKey(viewerKey);
        profileViewRepository.save(row);
        return true;
    }

    private static String buildViewerKey(User viewer, String clientViewerKey, String clientIp) {
        if (viewer != null) {
            return "u:" + viewer.getId();
        }
        String raw = StringUtils.hasText(clientViewerKey)
            ? clientViewerKey.trim()
            : (clientIp == null ? "anon" : clientIp.trim());
        return "a:" + sha256Short(raw);
    }

    private static String sha256Short(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(dig).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
