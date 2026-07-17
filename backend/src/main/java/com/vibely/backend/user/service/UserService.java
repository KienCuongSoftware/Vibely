package com.vibely.backend.user.service;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.user.dto.PrivacySettingsResponse;
import com.vibely.backend.user.dto.PublicUserProfileResponse;
import com.vibely.backend.user.dto.UpdatePrivacySettingsRequest;
import com.vibely.backend.user.dto.UpdateProfileRequest;
import com.vibely.backend.user.dto.UserFollowListItemResponse;
import com.vibely.backend.user.dto.UserFollowListResponse;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.entity.FollowEntity;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.storage.S3OwnedMediaValidator;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.video.VideoStatus;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UsernameService usernameService;
    private final UserAvatarResolver userAvatarResolver;
    private final FollowRepository followRepository;
    private final LikeRepository likeRepository;
    private final VideoViewRepository videoViewRepository;
    private final S3OwnedMediaValidator ownedMediaValidator;
    private final ProfileVisibilityService profileVisibilityService;
    private final ObjectProvider<ExploreCacheService> exploreCacheService;

    public UserService(
        UserRepository userRepository,
        UsernameService usernameService,
        UserAvatarResolver userAvatarResolver,
        FollowRepository followRepository,
        LikeRepository likeRepository,
        VideoViewRepository videoViewRepository,
        S3OwnedMediaValidator ownedMediaValidator,
        ProfileVisibilityService profileVisibilityService,
        ObjectProvider<ExploreCacheService> exploreCacheService
    ) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
        this.userAvatarResolver = userAvatarResolver;
        this.followRepository = followRepository;
        this.likeRepository = likeRepository;
        this.videoViewRepository = videoViewRepository;
        this.ownedMediaValidator = ownedMediaValidator;
        this.profileVisibilityService = profileVisibilityService;
        this.exploreCacheService = exploreCacheService;
    }

    public PublicUserProfileResponse getPublicProfile(String username, Authentication authentication) {
        User user = getUserByUsername(username);
        if (user.isBanned()) {
            return toBannedPublicProfile(user);
        }
        return toPublicProfile(user, authentication);
    }

    public UserFollowListResponse getFollowing(
        String username,
        int page,
        int size,
        Authentication authentication
    ) {
        User targetUser = getUserByUsername(username);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<FollowEntity> relations = followRepository.findFollowingPage(targetUser, pageable);
        return toUserFollowListResponse(relations, authentication, FollowEntity::getFollowing);
    }

    public UserFollowListResponse getFollowers(
        String username,
        int page,
        int size,
        Authentication authentication
    ) {
        User targetUser = getUserByUsername(username);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<FollowEntity> relations = followRepository.findFollowersPage(targetUser, pageable);
        return toUserFollowListResponse(relations, authentication, FollowEntity::getFollower);
    }

    @Transactional
    public PublicUserProfileResponse updateProfile(
        String email,
        UpdateProfileRequest request,
        Authentication authentication
    ) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        String normalizedUsername = usernameService.validateForRegistration(request.username());
        String currentNormalized = usernameService.normalize(user.getUsername());
        if (!normalizedUsername.equals(currentNormalized) && userRepository.existsByUsername(normalizedUsername)) {
            throw new BadRequestException("Vibely ID đã tồn tại");
        }

        user.setUsername(normalizedUsername);
        user.setDisplayName(request.displayName().trim());
        user.setBio(request.bio() == null || request.bio().isBlank() ? "" : request.bio().trim());
        String previousAvatar = user.getAvatarUrl();
        String avatarUrl = request.avatarUrl() == null || request.avatarUrl().isBlank()
            ? null
            : request.avatarUrl().trim();
        if (avatarUrl != null) {
            ownedMediaValidator.requireAllowedAvatarUrl(avatarUrl, user.getId());
        }
        user.setAvatarUrl(avatarUrl);
        User saved = userRepository.save(user);

        if (!Objects.equals(previousAvatar, avatarUrl)) {
            ExploreCacheService cache = exploreCacheService.getIfAvailable();
            if (cache != null) {
                // Cards embed authorAvatarUrl — flush so Explore/For You pick up the new photo.
                cache.evictByPrefix("trending");
                cache.evictByPrefix("category:");
                cache.evictByPrefix("topic:");
                cache.evictByPrefix("for-you:");
                cache.evictByPrefix("related:");
            }
        }

        return toPublicProfile(saved, authentication);
    }

    @Transactional
    public PrivacySettingsResponse updatePrivacySettings(String email, UpdatePrivacySettingsRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        user.setPrivateAccount(Boolean.TRUE.equals(request.privateAccount()));
        userRepository.save(user);
        return new PrivacySettingsResponse(user.isPrivateAccount());
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

    private PublicUserProfileResponse toBannedPublicProfile(User user) {
        long uid = user.getId();
        long followingCount = followRepository.countByFollower_Id(uid);
        long followerCount = followRepository.countByFollowing_Id(uid);
        long totalLikeCount = likeRepository.countByVideo_Author_IdAndVideo_Status(uid, VideoStatus.READY);
        long totalViewCount = videoViewRepository.countByVideo_Author_IdAndVideo_Status(uid, VideoStatus.READY);
        return new PublicUserProfileResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            "",
            userAvatarResolver.resolve(user),
            followingCount,
            followerCount,
            totalLikeCount,
            totalViewCount,
            false,
            false,
            false,
            false,
            "BANNED"
        );
    }

    private PublicUserProfileResponse toPublicProfile(User user, Authentication authentication) {
        long uid = user.getId();
        long followingCount = followRepository.countByFollower_Id(uid);
        long followerCount = followRepository.countByFollowing_Id(uid);
        long totalLikeCount = likeRepository.countByVideo_Author_IdAndVideo_Status(uid, VideoStatus.READY);
        long totalViewCount = videoViewRepository.countByVideo_Author_IdAndVideo_Status(uid, VideoStatus.READY);
        User viewer = getViewer(authentication);
        boolean followedByViewer = false;
        boolean followRequestPending = false;
        if (viewer != null && !viewer.getId().equals(uid)) {
            followedByViewer = followRepository.existsAcceptedByFollowerAndFollowing(viewer, user);
            followRequestPending = !followedByViewer
                && followRepository.existsPendingByFollowerAndFollowing(viewer, user);
        }
        boolean contentVisible = profileVisibilityService.canViewProfileContent(user, viewer);
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
            user.isPrivateAccount(),
            contentVisible,
            followedByViewer,
            followRequestPending,
            "ACTIVE"
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
}
