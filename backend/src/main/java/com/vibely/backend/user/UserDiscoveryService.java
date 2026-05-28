package com.vibely.backend.user;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.storage.S3PresignedUploadService;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDiscoveryService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final SuggestedCreatorRepository suggestedCreatorRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final ObjectProvider<S3PresignedUploadService> presignedUploadService;

    public UserDiscoveryService(
        UserRepository userRepository,
        FollowRepository followRepository,
        SuggestedCreatorRepository suggestedCreatorRepository,
        UserAvatarResolver userAvatarResolver,
        ObjectProvider<S3PresignedUploadService> presignedUploadService
    ) {
        this.userRepository = userRepository;
        this.followRepository = followRepository;
        this.suggestedCreatorRepository = suggestedCreatorRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.presignedUploadService = presignedUploadService;
    }

    @Transactional(readOnly = true)
    public SuggestedCreatorsResponse getSuggestedCreators(String email, int page, int size) {
        User viewer = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        long viewerFollowingCount = followRepository.countByFollower_Id(viewer.getId());
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 48));
        Page<SuggestedCreatorProjection> result =
            suggestedCreatorRepository.findSuggestedCreators(viewer.getId(), pageable);

        List<Long> ids = result.getContent().stream()
            .map(SuggestedCreatorProjection::getId)
            .toList();
        Set<Long> followedCreatorIds = ids.isEmpty()
            ? Set.of()
            : new HashSet<>(followRepository.findFollowingIdsForFollower(viewer.getId(), ids));
        var usersById = userRepository.findAllById(ids).stream()
            .collect(java.util.stream.Collectors.toMap(User::getId, user -> user));

        List<SuggestedCreatorDto> items = result.getContent().stream()
            .map(row -> {
                User author = usersById.get(row.getId());
                return new SuggestedCreatorDto(
                    row.getId(),
                    row.getUsername(),
                    row.getDisplayName(),
                    author != null ? userAvatarResolver.resolve(author) : null,
                    row.getVideoCount() != null ? row.getVideoCount() : 0L,
                    row.getFollowerCount() != null ? row.getFollowerCount() : 0L,
                    presignPlaybackUrl(row.getPreviewThumbnailUrl()),
                    presignPlaybackUrl(row.getPreviewVideoUrl()),
                    followedCreatorIds.contains(row.getId())
                );
            })
            .filter(item ->
                item.previewThumbnailUrl() != null
                    && !item.previewThumbnailUrl().isBlank()
                    && item.previewVideoUrl() != null
                    && !item.previewVideoUrl().isBlank()
            )
            .toList();

        return new SuggestedCreatorsResponse(
            viewerFollowingCount,
            items,
            result.hasNext(),
            result.getNumber(),
            result.getSize()
        );
    }

    private String presignPlaybackUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            return url;
        }
        return svc.presignGetForPlayback(url).orElse(url);
    }
}
