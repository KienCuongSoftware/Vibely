package com.vibely.backend.user;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UsernameService usernameService;
    private final UserAvatarResolver userAvatarResolver;

    public UserController(
        UserRepository userRepository,
        UsernameService usernameService,
        UserAvatarResolver userAvatarResolver
    ) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
        this.userAvatarResolver = userAvatarResolver;
    }

    @GetMapping("/check-username")
    public ApiResponse<UsernameCheckResponse> checkUsername(@RequestParam("username") String username) {
        return ApiResponse.success(usernameService.checkAvailability(username));
    }

    @PutMapping("/me")
    public ApiResponse<PublicUserProfileResponse> updateMe(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        String normalizedUsername = usernameService.validateForRegistration(request.username());
        String currentNormalized = usernameService.normalize(user.getUsername());
        if (!normalizedUsername.equals(currentNormalized) && userRepository.existsByUsername(normalizedUsername)) {
            throw new BadRequestException("Vibely ID đã tồn tại");
        }

        user.setUsername(normalizedUsername);
        user.setDisplayName(request.displayName().trim());
        user.setBio(request.bio() == null || request.bio().isBlank() ? "" : request.bio().trim());
        user.setAvatarUrl(request.avatarUrl() == null || request.avatarUrl().isBlank()
            ? null
            : request.avatarUrl().trim());
        User saved = userRepository.save(user);

        return ApiResponse.success(
            new PublicUserProfileResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getDisplayName(),
                saved.getBio(),
                userAvatarResolver.resolve(saved)
            )
        );
    }

    @GetMapping("/{username}")
    public ApiResponse<PublicUserProfileResponse> getPublicProfile(@PathVariable("username") String username) {
        String normalized = usernameService.normalize(username);
        User user = userRepository.findByUsername(normalized)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        return ApiResponse.success(
            new PublicUserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getBio(),
                userAvatarResolver.resolve(user)
            )
        );
    }
}
