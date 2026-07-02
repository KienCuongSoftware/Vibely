package com.vibely.backend.user.service;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.user.dto.PublicUserProfileResponse;
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
import com.vibely.backend.video.VideoStatus;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
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

    public UserService(
        UserRepository userRepository,
        UsernameService usernameService,
        UserAvatarResolver userAvatarResolver,
        FollowRepository followRepository,
        LikeRepository likeRepository,
        VideoViewRepository videoViewRepository,
        S3OwnedMediaValidator ownedMediaValidator
    ) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
        this.userAvatarResolver = userAvatarResolver;
        this.followRepository = followRepository;
        this.likeRepository = likeRepository;
        this.videoViewRepository = videoViewRepository;
        this.ownedMediaValidator = ownedMediaValidator;
    }

    public PublicUserProfileResponse getPublicProfile(String username, Authentication authentication) {
        User user = getUserByUsername(username);
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
        String avatarUrl = request.avatarUrl() == null || request.avatarUrl().isBlank()
            ? null
            : request.avatarUrl().trim();
        if (avatarUrl != null) {
            ownedMediaValidator.requireAllowedAvatarUrl(avatarUrl, user.getId());
        }
        user.setAvatarUrl(avatarUrl);
        User saved = userRepository.save(user);

        return toPublicProfile(saved, authentication);
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
}
