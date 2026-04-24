package com.vibely.backend.user;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.NotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
