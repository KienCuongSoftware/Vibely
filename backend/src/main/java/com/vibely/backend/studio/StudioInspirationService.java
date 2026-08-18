package com.vibely.backend.studio;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.user.AccountRegionCodes;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.SuggestedCreatorProjection;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPrivacy;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StudioInspirationService {

    static final int MIN_FOLLOWERS_VIEWED = 1_000;
    private static final int MAX_PAGE_SIZE = 48;
    private static final int MAX_SAVED = 500;

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final LikeRepository likeRepository;
    private final VideoViewRepository videoViewRepository;
    private final CategoryRepository categoryRepository;
    private final VideoRepository videoRepository;
    private final StudioInspirationRepository inspirationRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final MediaUrlPresigner mediaUrlPresigner;

    public StudioInspirationService(
        UserRepository userRepository,
        FollowRepository followRepository,
        LikeRepository likeRepository,
        VideoViewRepository videoViewRepository,
        CategoryRepository categoryRepository,
        VideoRepository videoRepository,
        StudioInspirationRepository inspirationRepository,
        UserAvatarResolver userAvatarResolver,
        MediaUrlPresigner mediaUrlPresigner
    ) {
        this.userRepository = userRepository;
        this.followRepository = followRepository;
        this.likeRepository = likeRepository;
        this.videoViewRepository = videoViewRepository;
        this.categoryRepository = categoryRepository;
        this.videoRepository = videoRepository;
        this.inspirationRepository = inspirationRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.mediaUrlPresigner = mediaUrlPresigner;
    }

    @Transactional(readOnly = true)
    public List<StudioInspirationCategoryResponse> categories() {
        return categoryRepository.findByEnabledTrueOrderByNameAsc().stream()
            .filter(c -> c.getSlug() != null && !"all".equalsIgnoreCase(c.getSlug()))
            .map(c -> new StudioInspirationCategoryResponse(c.getSlug(), c.getName()))
            .toList();
    }

    @Transactional(readOnly = true)
    public StudioInspirationPageResponse trending(
        String email,
        String kind,
        String category,
        String region,
        int page,
        int size
    ) {
        User viewer = requireUser(email);
        long followerCount = followRepository.countByFollowing_Id(viewer.getId());
        PageRequest pageable = pageable(page, size);
        boolean creators = "creators".equalsIgnoreCase(kind);
        boolean filterRegion = isRegionFilter(region);
        String regionCode = filterRegion ? AccountRegionCodes.normalize(region) : "";
        boolean filterCategory = isCategoryFilter(category);
        String slug = filterCategory ? category.trim().toLowerCase() : "";

        if (creators) {
            Page<SuggestedCreatorProjection> result = inspirationRepository.findTrendingCreators(
                viewer.getId(),
                filterRegion,
                regionCode,
                pageable
            );
            return new StudioInspirationPageResponse(
                List.of(),
                toCreatorResponses(viewer, result.getContent(), pageable.getPageNumber(), pageable.getPageSize()),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext(),
                followerCount
            );
        }

        Page<ExploreVideoProjection> result = inspirationRepository.findTrendingVideos(
            filterRegion,
            regionCode,
            filterCategory,
            slug,
            pageable
        );
        return new StudioInspirationPageResponse(
            toVideoResponses(viewer.getId(), result.getContent(), pageable.getPageNumber(), pageable.getPageSize()),
            List.of(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.hasNext(),
            followerCount
        );
    }

    @Transactional(readOnly = true)
    public StudioInspirationRecommendedResponse recommended(
        String email,
        String kind,
        int page,
        int size
    ) {
        User viewer = requireUser(email);
        long followerCount = followRepository.countByFollowing_Id(viewer.getId());
        PageRequest pageable = pageable(page, size);
        String mode = kind == null ? "similar_posts" : kind.trim().toLowerCase();

        if ("followers_viewed".equals(mode) && followerCount < MIN_FOLLOWERS_VIEWED) {
            return new StudioInspirationRecommendedResponse(
                true,
                MIN_FOLLOWERS_VIEWED,
                followerCount,
                List.of(),
                List.of(),
                pageable.getPageNumber(),
                pageable.getPageSize(),
                0,
                false
            );
        }

        if ("similar_creators".equals(mode)) {
            Page<SuggestedCreatorProjection> result =
                inspirationRepository.findSimilarCreators(viewer.getId(), pageable);
            return new StudioInspirationRecommendedResponse(
                false,
                MIN_FOLLOWERS_VIEWED,
                followerCount,
                List.of(),
                toCreatorResponses(viewer, result.getContent(), pageable.getPageNumber(), pageable.getPageSize()),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
            );
        }

        Page<ExploreVideoProjection> result = "followers_viewed".equals(mode)
            ? inspirationRepository.findVideosLikedByFollowers(viewer.getId(), pageable)
            : inspirationRepository.findSimilarVideos(viewer.getId(), pageable);
        return new StudioInspirationRecommendedResponse(
            false,
            MIN_FOLLOWERS_VIEWED,
            followerCount,
            toVideoResponses(viewer.getId(), result.getContent(), pageable.getPageNumber(), pageable.getPageSize()),
            List.of(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.hasNext()
        );
    }

    @Transactional(readOnly = true)
    public StudioInspirationPageResponse saved(String email, int page, int size) {
        User viewer = requireUser(email);
        long followerCount = followRepository.countByFollowing_Id(viewer.getId());
        PageRequest pageable = pageable(page, size);
        Page<ExploreVideoProjection> result = inspirationRepository.findSavedVideos(viewer.getId(), pageable);
        List<StudioInspirationVideoResponse> items = toVideoResponses(
            viewer.getId(),
            result.getContent(),
            pageable.getPageNumber(),
            pageable.getPageSize()
        ).stream()
            .map(item -> new StudioInspirationVideoResponse(
                item.rank(),
                item.publicId(),
                item.authorId(),
                item.authorUsername(),
                item.authorDisplayName(),
                item.authorAvatarUrl(),
                item.title(),
                item.description(),
                item.thumbnailUrl(),
                item.videoUrl(),
                item.viewCount(),
                item.likeCount(),
                true
            ))
            .toList();
        return new StudioInspirationPageResponse(
            items,
            List.of(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.hasNext(),
            followerCount
        );
    }

    @Transactional
    public StudioInspirationVideoResponse save(String email, UUID publicId) {
        User viewer = requireUser(email);
        Video video = requirePublicVideo(publicId);
        if (inspirationRepository.existsByUser_IdAndVideo_Id(viewer.getId(), video.getId())) {
            return toSingleVideo(viewer.getId(), video, true);
        }
        if (inspirationRepository.countByUser_Id(viewer.getId()) >= MAX_SAVED) {
            throw new BadRequestException("Bạn đã lưu tối đa số bài Cảm hứng cho phép.");
        }
        StudioInspiration row = new StudioInspiration();
        row.setUser(viewer);
        row.setVideo(video);
        inspirationRepository.save(row);
        return toSingleVideo(viewer.getId(), video, true);
    }

    @Transactional
    public void unsave(String email, UUID publicId) {
        User viewer = requireUser(email);
        Video video = videoRepository.findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        inspirationRepository.deleteByUser_IdAndVideo_Id(viewer.getId(), video.getId());
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private Video requirePublicVideo(UUID publicId) {
        Video video = videoRepository.findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (video.getStatus() != VideoStatus.READY
            || video.isStudioDraft()
            || (video.getScheduledAt() != null && video.getScheduledAt().isAfter(java.time.Instant.now()))
            || video.getPrivacy() != VideoPrivacy.PUBLIC) {
            throw new NotFoundException("Không tìm thấy video");
        }
        return video;
    }

    private PageRequest pageable(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
    }

    private boolean isRegionFilter(String region) {
        if (!StringUtils.hasText(region) || "all".equalsIgnoreCase(region.trim())) {
            return false;
        }
        return AccountRegionCodes.isAllowed(region);
    }

    private boolean isCategoryFilter(String category) {
        if (!StringUtils.hasText(category) || "all".equalsIgnoreCase(category.trim())) {
            return false;
        }
        return categoryRepository.findBySlugAndEnabledTrue(category.trim().toLowerCase()).isPresent();
    }

    private List<StudioInspirationVideoResponse> toVideoResponses(
        Long viewerId,
        List<ExploreVideoProjection> rows,
        int page,
        int size
    ) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = rows.stream().map(ExploreVideoProjection::getId).toList();
        Map<Long, Long> likes = groupCount(likeRepository.countGroupedByVideoIds(ids));
        Map<Long, Long> views = groupCount(videoViewRepository.countGroupedByVideoIds(ids));
        Set<Long> savedIds = new HashSet<>(inspirationRepository.findSavedVideoIds(viewerId, ids));
        int base = page * size;
        return java.util.stream.IntStream.range(0, rows.size())
            .mapToObj(i -> {
                ExploreVideoProjection v = rows.get(i);
                return new StudioInspirationVideoResponse(
                    base + i + 1,
                    v.getPublicId(),
                    v.getAuthorId(),
                    v.getAuthorUsername(),
                    v.getAuthorDisplayName(),
                    mediaUrlPresigner.presignPlaybackUrl(v.getAuthorAvatarUrl()),
                    v.getTitle(),
                    v.getDescription(),
                    mediaUrlPresigner.presignPlaybackUrl(v.getThumbnailUrl()),
                    mediaUrlPresigner.presignPlaybackUrl(v.getVideoUrl()),
                    views.getOrDefault(v.getId(), 0L),
                    likes.getOrDefault(v.getId(), 0L),
                    savedIds.contains(v.getId())
                );
            })
            .toList();
    }

    private List<StudioInspirationCreatorResponse> toCreatorResponses(
        User viewer,
        List<SuggestedCreatorProjection> rows,
        int page,
        int size
    ) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = rows.stream().map(SuggestedCreatorProjection::getId).toList();
        Set<Long> followed = ids.isEmpty()
            ? Set.of()
            : new HashSet<>(followRepository.findFollowingIdsForFollower(viewer.getId(), ids));
        var usersById = userRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(User::getId, user -> user));
        int base = page * size;
        return java.util.stream.IntStream.range(0, rows.size())
            .mapToObj(i -> {
                SuggestedCreatorProjection row = rows.get(i);
                User author = usersById.get(row.getId());
                return new StudioInspirationCreatorResponse(
                    base + i + 1,
                    row.getId(),
                    row.getUsername(),
                    row.getDisplayName(),
                    author != null ? userAvatarResolver.resolve(author) : null,
                    row.getVideoCount() != null ? row.getVideoCount() : 0L,
                    row.getFollowerCount() != null ? row.getFollowerCount() : 0L,
                    mediaUrlPresigner.presignPlaybackUrl(row.getPreviewThumbnailUrl()),
                    mediaUrlPresigner.presignPlaybackUrl(row.getPreviewVideoUrl()),
                    followed.contains(row.getId())
                );
            })
            .toList();
    }

    private StudioInspirationVideoResponse toSingleVideo(Long viewerId, Video video, boolean saved) {
        Long id = video.getId();
        Map<Long, Long> likes = groupCount(likeRepository.countGroupedByVideoIds(List.of(id)));
        Map<Long, Long> views = groupCount(videoViewRepository.countGroupedByVideoIds(List.of(id)));
        User author = video.getAuthor();
        return new StudioInspirationVideoResponse(
            1,
            video.getPublicId(),
            author != null ? author.getId() : null,
            author != null ? author.getUsername() : null,
            author != null ? author.getDisplayName() : null,
            author != null ? userAvatarResolver.resolve(author) : null,
            video.getTitle(),
            video.getDescription(),
            mediaUrlPresigner.presignPlaybackUrl(video.getThumbnailUrl()),
            mediaUrlPresigner.presignPlaybackUrl(video.getVideoUrl()),
            views.getOrDefault(id, 0L),
            likes.getOrDefault(id, 0L),
            saved
        );
    }

    private Map<Long, Long> groupCount(List<Object[]> tuples) {
        if (tuples == null || tuples.isEmpty()) {
            return Collections.emptyMap();
        }
        return tuples.stream().collect(Collectors.toMap(
            row -> ((Number) row[0]).longValue(),
            row -> ((Number) row[1]).longValue()
        ));
    }
}
