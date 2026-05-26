package com.vibely.backend.user;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.FollowEntity;
import com.vibely.backend.feed.FeedPageResponse;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoViewRepository;
import com.vibely.backend.video.VideoService;
import com.vibely.backend.video.VideoStatus;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    private final VideoService videoService;
    private final FollowRepository followRepository;
    private final LikeRepository likeRepository;
    private final VideoViewRepository videoViewRepository;

    public UserController(
        UserRepository userRepository,
        UsernameService usernameService,
        UserAvatarResolver userAvatarResolver,
        VideoService videoService,
        FollowRepository followRepository,
        LikeRepository likeRepository,
        VideoViewRepository videoViewRepository
    ) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
        this.userAvatarResolver = userAvatarResolver;
        this.videoService = videoService;
        this.followRepository = followRepository;
        this.likeRepository = likeRepository;
        this.videoViewRepository = videoViewRepository;
    }

    private User getViewer(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName()).orElse(null);
    }

    private User getUserByUsername(String username) {
        String normalized = usernameService.normalize(username);
        return userRepository.findByUsername(normalized)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private PublicUserProfileResponse toPublicProfile(User user, Authentication authentication) {
        long uid = user.getId();
        long followingCount = followRepository.countByFollower_Id(uid);
        long followerCount = followRepository.countByFollowing_Id(uid);
        long totalLikeCount = likeRepository.countByVideo_Author_IdAndVideo_Status(uid, VideoStatus.READY);
        long totalViewCount = videoViewRepository.countByVideo_Author_IdAndVideo_Status(uid, VideoStatus.READY);
        boolean followedByViewer = false;
        User viewer = getViewer(authentication);
        if (viewer != null && !viewer.getId().equals(uid)) {
            followedByViewer = followRepository.existsByFollowerAndFollowing(viewer, user);
        }
        return new PublicUserProfileResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getBio(),
            userAvatarResolver.resolve(user),
            followingCount,
            followerCount,
            totalLikeCount,
            totalViewCount,
            followedByViewer
        );
    }

    private UserFollowListResponse toUserFollowListResponse(
        Page<FollowEntity> page,
        Authentication authentication,
        Function<FollowEntity, User> relationSelector
    ) {
        User viewer = getViewer(authentication);
        List<User> listedUsers = page.getContent().stream()
            .map(relationSelector)
            .filter(user -> user != null && user.getId() != null)
            .toList();
        Set<Long> followedIds = Set.of();
        if (viewer != null && !listedUsers.isEmpty()) {
            List<Long> candidateIds = listedUsers.stream().map(User::getId).toList();
            followedIds = new HashSet<>(followRepository.findFollowingIdsForFollower(viewer.getId(), candidateIds));
        }
        Set<Long> finalFollowedIds = followedIds;
        List<UserFollowListItemResponse> items = listedUsers.stream()
            .map(listedUser -> new UserFollowListItemResponse(
                listedUser.getId(),
                listedUser.getUsername(),
                listedUser.getDisplayName(),
                userAvatarResolver.resolve(listedUser),
                viewer != null
                    && !viewer.getId().equals(listedUser.getId())
                    && finalFollowedIds.contains(listedUser.getId()),
                viewer != null && viewer.getId().equals(listedUser.getId())
            ))
            .toList();
        return new UserFollowListResponse(items, page.hasNext(), page.getNumber(), page.getSize());
    }

    @GetMapping("/check-username")
    public ApiResponse<UsernameCheckResponse> checkUsername(@RequestParam("username") String username) {
        return ApiResponse.success(usernameService.checkAvailability(username));
    }

    @GetMapping("/me/liked-videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myLikedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        return ApiResponse.success(videoService.getMyLikedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/me/bookmarked-videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myBookmarkedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        return ApiResponse.success(videoService.getMyBookmarkedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/me/videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myUploadedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(videoService.getMyUploadedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/{username}/videos")
    public ApiResponse<FeedPageResponse> publicUserVideos(
        @PathVariable("username") String username,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(videoService.getPublicVideosForUsername(username, page, size));
    }

    @GetMapping("/{username}/following")
    public ApiResponse<UserFollowListResponse> getFollowing(
        @PathVariable("username") String username,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        Authentication authentication
    ) {
        User targetUser = getUserByUsername(username);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<FollowEntity> relations = followRepository.findFollowingPage(targetUser, pageable);
        return ApiResponse.success(toUserFollowListResponse(relations, authentication, FollowEntity::getFollowing));
    }

    @GetMapping("/{username}/followers")
    public ApiResponse<UserFollowListResponse> getFollowers(
        @PathVariable("username") String username,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        Authentication authentication
    ) {
        User targetUser = getUserByUsername(username);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<FollowEntity> relations = followRepository.findFollowersPage(targetUser, pageable);
        return ApiResponse.success(toUserFollowListResponse(relations, authentication, FollowEntity::getFollower));
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

        return ApiResponse.success(toPublicProfile(saved, authentication));
    }

    @GetMapping("/{username}")
    public ApiResponse<PublicUserProfileResponse> getPublicProfile(
        @PathVariable("username") String username,
        Authentication authentication
    ) {
        User user = getUserByUsername(username);
        return ApiResponse.success(toPublicProfile(user, authentication));
    }
}
