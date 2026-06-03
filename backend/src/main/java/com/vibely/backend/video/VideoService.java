package com.vibely.backend.video;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.discovery.service.RecommendationService;
import com.vibely.backend.discovery.service.UserInterestSignalProcessor;
import com.vibely.backend.discovery.service.VideoDiscoveryIndexer;
import com.vibely.backend.discovery.service.VideoEngagementStatsService;
import com.vibely.backend.explore.Hashtag;
import com.vibely.backend.explore.HashtagRepository;
import com.vibely.backend.explore.VideoCategory;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.explore.VideoHashtag;
import com.vibely.backend.explore.VideoHashtagRepository;
import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.explore.service.ExploreRankingService;
import com.vibely.backend.feed.FeedCursorCodec;
import com.vibely.backend.feed.FeedPageResponse;
import com.vibely.backend.feed.FeedSort;
import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoViewEntity;
import com.vibely.backend.interaction.VideoViewRepository;
import com.vibely.backend.processing.VideoProcessingEnqueueService;
import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.interaction.VideoBookmarkRepository;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.storage.S3PresignedUploadService;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.user.UsernameService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoService {
    private static final Pattern VIDEO_EXT_PATTERN = Pattern.compile("\\.(mp4|webm|mov)(\\?.*)?$", Pattern.CASE_INSENSITIVE);
    private static final Pattern REGEX_META_PATTERN = Pattern.compile("([\\\\.^$|?*+()\\[\\]{}-])");

    /** Tối thiểu ~2s phát thật (sau upload/S3 + pipeline) — không tính chỉ impression trên feed. */
    private static final long VIEW_MIN_PLAYED_MS = 2_000L;
    private static final long VIEW_MIN_CLIENT_MS = 500L;
    private static final long VIEW_SANITY_MAX_MS = 3_600_000L;
    /** Clip ngắn hơn 2s: cần ≥ 25% duration (ms). */
    private static final int SHORT_CLIP_QUALIFY_PERCENT = 25;

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;
    private final VideoViewRepository videoViewRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final UsernameService usernameService;
    private final VideoProcessingEnqueueService videoProcessingEnqueueService;
    private final ObjectProvider<S3PresignedUploadService> presignedUploadService;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final CategoryClassifierService categoryClassifierService;
    private final VideoCategoryRepository videoCategoryRepository;
    private final VideoHashtagRepository videoHashtagRepository;
    private final HashtagRepository hashtagRepository;
    private final ExploreRankingService exploreRankingService;
    private final ExploreCacheService exploreCacheService;
    private final ObjectProvider<VideoDiscoveryIndexer> videoDiscoveryIndexer;
    private final ObjectProvider<VideoEngagementStatsService> videoEngagementStatsService;
    private final ObjectProvider<UserInterestSignalProcessor> userInterestSignalProcessor;
    private final ObjectProvider<RecommendationService> recommendationService;

    public VideoService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        LikeRepository likeRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        CommentRepository commentRepository,
        FollowRepository followRepository,
        VideoViewRepository videoViewRepository,
        UserAvatarResolver userAvatarResolver,
        UsernameService usernameService,
        VideoProcessingEnqueueService videoProcessingEnqueueService,
        ObjectProvider<S3PresignedUploadService> presignedUploadService,
        S3ObjectUrlBuilder objectUrlBuilder,
        CategoryClassifierService categoryClassifierService,
        VideoCategoryRepository videoCategoryRepository,
        VideoHashtagRepository videoHashtagRepository,
        HashtagRepository hashtagRepository,
        ExploreRankingService exploreRankingService,
        ExploreCacheService exploreCacheService,
        ObjectProvider<VideoDiscoveryIndexer> videoDiscoveryIndexer,
        ObjectProvider<VideoEngagementStatsService> videoEngagementStatsService,
        ObjectProvider<UserInterestSignalProcessor> userInterestSignalProcessor,
        ObjectProvider<RecommendationService> recommendationService
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.commentRepository = commentRepository;
        this.followRepository = followRepository;
        this.videoViewRepository = videoViewRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.usernameService = usernameService;
        this.videoProcessingEnqueueService = videoProcessingEnqueueService;
        this.presignedUploadService = presignedUploadService;
        this.objectUrlBuilder = objectUrlBuilder;
        this.categoryClassifierService = categoryClassifierService;
        this.videoCategoryRepository = videoCategoryRepository;
        this.videoHashtagRepository = videoHashtagRepository;
        this.hashtagRepository = hashtagRepository;
        this.exploreRankingService = exploreRankingService;
        this.exploreCacheService = exploreCacheService;
        this.videoDiscoveryIndexer = videoDiscoveryIndexer;
        this.videoEngagementStatsService = videoEngagementStatsService;
        this.userInterestSignalProcessor = userInterestSignalProcessor;
        this.recommendationService = recommendationService;
    }

    @Transactional
    public VideoResponse createVideo(String email, VideoCreateRequest request) {
        User author = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = new Video();
        video.setAuthor(author);
        video.setTitle(request.getTitle());
        video.setDescription(request.getDescription());
        video.setVideoUrl(request.getVideoUrl());
        video.setThumbnailUrl(request.getThumbnailUrl());
        String audioUrl = normalizeText(request.getAudioUrl());
        if (audioUrl == null) {
            audioUrl = deriveAudioUrlFromVideoUrl(request.getVideoUrl());
        }
        video.setAudioUrl(audioUrl);
        String audioTitle = normalizeText(request.getAudioTitle());
        if (audioTitle == null) {
            audioTitle = "âm thanh gốc - " + resolveAuthorDisplayName(author);
        }
        video.setAudioTitle(audioTitle);
        video.setStatus(VideoStatus.RAW);
        Video saved = videoRepository.save(video);
        syncExploreSignals(saved);
        videoProcessingEnqueueService.enqueueAfterVideoPersisted(saved);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getFeed(int page, int size, FeedSort sort, String viewerEmail) {
        Pageable pageable = PageRequest.of(page, size);
        Long viewerId = resolveViewerId(viewerEmail);
        if (sort == FeedSort.TRENDING_LITE) {
            Page<Video> resultPage = videoRepository.findTrendingByStatus(VideoStatus.READY, pageable);
            return toFeedPageResponse(resultPage, sort.name().toLowerCase(), null, viewerId);
        }
        Page<Video> resultPage = videoRepository.findByStatusOrderByCreatedAtDesc(VideoStatus.READY, pageable);
        String nextCursor = null;
        if (resultPage.hasNext() && !resultPage.getContent().isEmpty()) {
            Video last = resultPage.getContent().get(resultPage.getContent().size() - 1);
            nextCursor = FeedCursorCodec.encode(last.getCreatedAt(), last.getId());
        }
        return toFeedPageResponse(resultPage, sort.name().toLowerCase(), nextCursor, viewerId);
    }

    /**
     * Keyset pagination for the public latest feed (stable order: {@code createdAt desc, id desc}).
     */
    @Transactional(readOnly = true)
    public FeedPageResponse getLatestFeedKeyset(String cursor, int size, String viewerEmail) {
        Long viewerId = resolveViewerId(viewerEmail);
        int req = Math.max(1, Math.min(size, 50));
        LocalDateTime cTime = null;
        Long cId = null;
        if (cursor != null && !cursor.isBlank()) {
            FeedCursorCodec.Decoded d = FeedCursorCodec.decode(cursor);
            cTime = d.createdAt();
            cId = d.id();
        }
        Pageable p = PageRequest.of(0, req + 1);
        Page<Video> slice = cTime == null || cId == null
            ? videoRepository.findReadyFeedFirstPage(VideoStatus.READY, p)
            : videoRepository.findReadyFeedKeyset(VideoStatus.READY, cTime, cId, p);
        boolean hasNext = slice.getContent().size() > req;
        List<Video> rows = slice.getContent().stream().limit(req).toList();
        rows = shuffleFeedRows(rows);
        String next = null;
        if (hasNext && !rows.isEmpty()) {
            Video last = rows.get(rows.size() - 1);
            next = FeedCursorCodec.encode(last.getCreatedAt(), last.getId());
        }
        return new FeedPageResponse(
            toFeedResponses(rows, viewerId),
            0,
            req,
            hasNext ? -1L : rows.size(),
            hasNext,
            "latest",
            next
        );
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getForYouFeed(String viewerEmail, int size) {
        RecommendationService rec = recommendationService.getIfAvailable();
        Long viewerId = resolveViewerId(viewerEmail);
        int req = Math.max(1, Math.min(size, 50));
        if (rec == null) {
            return getLatestFeedKeyset(null, req, viewerEmail);
        }
        List<Long> ids = rec.forYouVideoIds(viewerId, req);
        if (ids.isEmpty()) {
            return getLatestFeedKeyset(null, req, viewerEmail);
        }
        Map<Long, Video> byId = videoRepository.findWithAuthorByIdIn(ids).stream()
            .collect(java.util.stream.Collectors.toMap(Video::getId, v -> v, (a, b) -> a));
        List<Video> ordered = ids.stream().map(byId::get).filter(Objects::nonNull).toList();
        return new FeedPageResponse(
            toFeedResponses(ordered, viewerId),
            0,
            req,
            ordered.size(),
            false,
            "for-you",
            null
        );
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getFollowingFeed(String email, int page, int size) {
        User follower = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        if (followRepository.countByFollower_Id(follower.getId()) == 0) {
            return new FeedPageResponse(Collections.emptyList(), page, size, 0, false, "following", null);
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<Video> resultPage = videoRepository.findReadyVideosFromFollowedCreators(
            follower.getId(),
            VideoStatus.READY,
            pageable
        );
        List<Video> shuffled = shuffleFeedRows(new ArrayList<>(resultPage.getContent()));
        return new FeedPageResponse(
            toFeedResponses(shuffled, follower.getId()),
            resultPage.getNumber(),
            resultPage.getSize(),
            resultPage.getTotalElements(),
            resultPage.hasNext(),
            "following",
            null
        );
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getVideosByAudio(String audioUrl, int page, int size) {
        String normalizedAudioUrl = normalizeText(audioUrl);
        if (normalizedAudioUrl == null) {
            throw new BadRequestException("Thiếu đường dẫn âm thanh.");
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Optional<String> audioKey = objectUrlBuilder.resolveKeyFromUrl(normalizedAudioUrl);
        Page<Video> resultPage = audioKey
            .filter(key -> !key.isBlank())
            .map(key -> videoRepository.findByAudioUrlOrKeyEndingAndStatus(
                normalizedAudioUrl,
                key,
                VideoStatus.READY,
                pageable
            ))
            .orElseGet(() -> videoRepository.findByAudioUrlAndStatusOrderByCreatedAtDesc(
                normalizedAudioUrl,
                VideoStatus.READY,
                pageable
            ));
        return toFeedPageResponse(resultPage, "sound");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getVideosByHashtag(String tag, int page, int size) {
        String normalizedTag = normalizeHashtag(tag);
        if (normalizedTag == null) {
            throw new BadRequestException("Thiếu hashtag.");
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 60));
        Page<Video> resultPage = videoRepository.findByHashtag(
            VideoStatus.READY.name(),
            escapeRegexLiteral(normalizedTag),
            pageable
        );
        return toFeedPageResponse(resultPage, "hashtag");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getMyLikedVideos(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        VideoStatus ready = VideoStatus.READY;
        VideoStatus removed = VideoStatus.REMOVED;
        VideoStatus failed = VideoStatus.FAILED;
        Page<Video> resultPage = likeRepository.findLikedVideosForUser(
            user,
            ready,
            user.getId(),
            removed,
            failed,
            pageable
        );
        return toFeedPageResponse(resultPage, "liked");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getMyBookmarkedVideos(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        VideoStatus ready = VideoStatus.READY;
        VideoStatus removed = VideoStatus.REMOVED;
        VideoStatus failed = VideoStatus.FAILED;
        Page<Video> resultPage = videoBookmarkRepository.findBookmarkedVideosForUser(
            user,
            ready,
            user.getId(),
            removed,
            failed,
            pageable
        );
        return toFeedPageResponse(resultPage, "bookmarks");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getMyUploadedVideos(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Page<Video> resultPage = videoRepository.findByAuthorIdExcludingStatus(
            user.getId(),
            VideoStatus.REMOVED,
            pageable
        );
        return toFeedPageResponse(resultPage, "my-uploads");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getPublicVideosForUsername(String rawUsername, int page, int size) {
        String normalized = usernameService.normalize(rawUsername);
        User author = userRepository.findByUsername(normalized)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Page<Video> resultPage = videoRepository.findByAuthorIdAndStatusEquals(
            author.getId(),
            VideoStatus.READY,
            pageable
        );
        return toFeedPageResponse(resultPage, "profile-uploads");
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideoByPublicIdForViewer(UUID publicId, String viewerEmail) {
        return getVideoByIdForViewer(getVideoByPublicIdOrThrow(publicId).getId(), viewerEmail);
    }

    /**
     * Public: READY for everyone. Other statuses (e.g. RAW) only for the author when viewerEmail is set.
     */
    @Transactional(readOnly = true)
    public VideoResponse getVideoByIdForViewer(Long id, String viewerEmail) {
        Video video = getVideoOrThrow(id);
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new NotFoundException("Không tìm thấy video");
        }
        if (video.getStatus() == VideoStatus.READY) {
            return toResponse(video, resolveFollowedByViewer(video, viewerEmail));
        }
        if (viewerEmail == null || viewerEmail.isBlank()) {
            throw new NotFoundException("Không tìm thấy video");
        }
        User viewer = userRepository.findByEmail(viewerEmail.trim())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (!Objects.equals(video.getAuthor().getId(), viewer.getId())) {
            throw new NotFoundException("Không tìm thấy video");
        }
        return toResponse(video);
    }

    @Transactional
    public VideoResponse updateVideo(String email, UUID publicId, VideoUpdateRequest request) {
        return updateVideo(email, getVideoByPublicIdOrThrow(publicId).getId(), request);
    }

    @Transactional
    public VideoResponse updateVideo(String email, Long videoId, VideoUpdateRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = getVideoOrThrow(videoId);
        if (!Objects.equals(video.getAuthor().getId(), user.getId())) {
            throw new BadRequestException("Bạn không có quyền sửa video này.");
        }
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new BadRequestException("Video đã bị gỡ, không thể sửa.");
        }
        video.setTitle(request.getTitle().trim());
        String desc = request.getDescription();
        video.setDescription(desc == null || desc.isBlank() ? null : desc.trim());
        if (request.getThumbnailUrl() != null) {
            video.setThumbnailUrl(normalizeText(request.getThumbnailUrl()));
        }
        Video saved = videoRepository.save(video);
        syncExploreSignals(saved);
        return toResponse(saved);
    }

    private void syncExploreSignals(Video video) {
        videoCategoryRepository.deleteByVideoId(video.getId());
        videoHashtagRepository.deleteByVideoId(video.getId());
        List<CategoryClassifierService.ScoredCategory> inferred = categoryClassifierService.inferCategories(
            video.getTitle(),
            video.getDescription(),
            video.getAudioTitle()
        );
        for (CategoryClassifierService.ScoredCategory scored : inferred) {
            videoCategoryRepository.save(new VideoCategory(video, scored.category(), scored.score()));
        }
        List<String> tags = categoryClassifierService.extractHashtags(video.getTitle(), video.getDescription());
        for (String tag : tags) {
            Hashtag hashtag = hashtagRepository.findByTag(tag)
                .orElseGet(() -> hashtagRepository.save(newHashtag(tag)));
            videoHashtagRepository.save(new VideoHashtag(video, hashtag));
        }
        exploreRankingService.recomputeVideo(video);
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:" + video.getPublicId());
        videoDiscoveryIndexer.ifAvailable(indexer -> indexer.indexAfterLegacySync(video.getId()));
    }

    private Hashtag newHashtag(String tag) {
        Hashtag hashtag = new Hashtag();
        hashtag.setTag(tag);
        return hashtag;
    }

    @Transactional
    public void deleteVideo(String email, UUID publicId) {
        deleteVideo(email, getVideoByPublicIdOrThrow(publicId).getId());
    }

    @Transactional
    public void deleteVideo(String email, Long videoId) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = getVideoOrThrow(videoId);
        if (!Objects.equals(video.getAuthor().getId(), user.getId())) {
            throw new BadRequestException("Bạn không có quyền xóa video này.");
        }
        if (video.getStatus() == VideoStatus.REMOVED) {
            return;
        }
        video.setStatus(VideoStatus.REMOVED);
        videoRepository.save(video);
    }

    public Video getVideoByPublicIdOrThrow(UUID publicId) {
        return videoRepository.findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
    }

    public Video getVideoOrThrow(Long id) {
        return videoRepository.findById(Objects.requireNonNull(id, "id"))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
    }

    private static boolean qualifiesPlaybackForView(Long watchedMs, Long durationMs) {
        if (watchedMs == null || watchedMs < VIEW_MIN_CLIENT_MS) {
            return false;
        }
        if (watchedMs > VIEW_SANITY_MAX_MS) {
            return false;
        }
        long dur = durationMs != null && durationMs > 0 ? durationMs : 0L;
        if (dur > 0 && dur < VIEW_MIN_PLAYED_MS) {
            return watchedMs * 100L >= dur * SHORT_CLIP_QUALIFY_PERCENT;
        }
        return watchedMs >= VIEW_MIN_PLAYED_MS;
    }

    /**
     * Ghi một lượt xem đủ thời lượng phát (client gửi watchedMs từ trình phát).
     * Mọi trạng thái trừ REMOVED. Body thiếu hoặc không đạt ngưỡng: bỏ qua (200, không tăng đếm).
     */
    @Transactional
    public void recordView(UUID publicId, VideoViewRequest body) {
        recordView(getVideoByPublicIdOrThrow(publicId).getId(), body, null);
    }

    @Transactional
    public void recordView(UUID publicId, VideoViewRequest body, String viewerEmail) {
        recordView(getVideoByPublicIdOrThrow(publicId).getId(), body, viewerEmail);
    }

    @Transactional
    public void recordView(Long id, VideoViewRequest body) {
        recordView(id, body, null);
    }

    @Transactional
    public void recordView(Long id, VideoViewRequest body, String viewerEmail) {
        if (body == null || !qualifiesPlaybackForView(body.watchedMs(), body.durationMs())) {
            return;
        }
        Video target = getVideoOrThrow(id);
        if (target.getStatus() == VideoStatus.REMOVED) {
            return;
        }
        VideoViewEntity row = new VideoViewEntity();
        row.setVideo(target);
        row.setWatchedMs(body.watchedMs());
        row.setDurationMs(body.durationMs());
        videoViewRepository.save(row);
        Long viewerId = resolveViewerId(viewerEmail);
        if (viewerId != null) {
            userInterestSignalProcessor.ifAvailable(p ->
                p.onView(viewerId, target, body.watchedMs(), body.durationMs())
            );
        }
        videoEngagementStatsService.ifAvailable(s -> s.recomputeSafely(target));
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:" + target.getPublicId());
    }

    @Transactional
    public void recordShare(UUID publicId) {
        recordShare(publicId, null);
    }

    @Transactional
    public void recordShare(UUID publicId, String viewerEmail) {
        recordShare(getVideoByPublicIdOrThrow(publicId).getId(), viewerEmail);
    }

    @Transactional
    public void recordShare(Long videoId) {
        recordShare(videoId, null);
    }

    @Transactional
    public void recordShare(Long videoId, String viewerEmail) {
        videoRepository.incrementShareCount(videoId, VideoStatus.READY);
        Video target = getVideoOrThrow(videoId);
        videoEngagementStatsService.ifAvailable(s -> s.recomputeSafely(target));
        Long viewerId = resolveViewerId(viewerEmail);
        if (viewerId != null) {
            userInterestSignalProcessor.ifAvailable(p -> p.onShare(viewerId, target));
        }
    }

    private static String resolveAuthorDisplayName(User author) {
        String raw = author.getDisplayName();
        if (raw != null && !raw.isBlank()) {
            return raw.trim();
        }
        return author.getUsername();
    }

    private static String normalizeText(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeHashtag(String raw) {
        String normalized = normalizeText(raw);
        if (normalized == null) {
            return null;
        }
        String withoutHash = normalized.replaceFirst("^#+", "").trim();
        return withoutHash.isEmpty() ? null : withoutHash;
    }

    private static String escapeRegexLiteral(String raw) {
        return REGEX_META_PATTERN.matcher(raw).replaceAll("\\\\$1");
    }

    private static String deriveAudioUrlFromVideoUrl(String videoUrl) {
        String normalizedVideoUrl = normalizeText(videoUrl);
        if (normalizedVideoUrl == null) return null;
        String mp3 = VIDEO_EXT_PATTERN.matcher(normalizedVideoUrl).replaceFirst(".mp3$2");
        if (mp3.equals(normalizedVideoUrl)) {
            return null;
        }
        return mp3.replace("/uploads/", "/audios/");
    }

    private String presignPlaybackUrlIfConfigured(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            return url;
        }
        return svc.presignGetForPlayback(url).orElse(url);
    }

    private Long resolveViewerId(String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(viewerEmail.trim())
            .map(User::getId)
            .orElse(null);
    }

    private boolean resolveFollowedByViewer(Video video, String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return false;
        }
        User viewer = userRepository.findByEmail(viewerEmail.trim()).orElse(null);
        if (viewer == null) {
            return false;
        }
        return followRepository.existsByFollowerAndFollowing(viewer, video.getAuthor());
    }

    private Set<Long> resolveFollowedAuthorIds(Long viewerId, List<Video> videos) {
        if (viewerId == null || videos.isEmpty()) {
            return Set.of();
        }
        List<Long> authorIds = videos.stream()
            .map(v -> v.getAuthor().getId())
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (authorIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(followRepository.findFollowingIdsForFollower(viewerId, authorIds));
    }

    private VideoResponse toResponse(Video video) {
        return toResponse(video, null, false);
    }

    private VideoResponse toResponse(Video video, boolean followedByViewer) {
        return toResponse(video, null, followedByViewer);
    }

    private record FeedInteractionCounts(
        Map<Long, Long> likes,
        Map<Long, Long> comments,
        Map<Long, Long> bookmarks,
        Map<Long, Long> views
    ) {
    }

    private List<VideoResponse> toFeedResponses(List<Video> videos, Long viewerId) {
        if (videos.isEmpty()) {
            return List.of();
        }
        List<Long> ids = videos.stream().map(Video::getId).toList();
        FeedInteractionCounts counts = new FeedInteractionCounts(
            countMap(likeRepository.countGroupedByVideoIds(ids)),
            countMap(commentRepository.countGroupedByVideoIds(ids)),
            countMap(videoBookmarkRepository.countGroupedByVideoIds(ids)),
            countMap(videoViewRepository.countGroupedByVideoIds(ids))
        );
        Set<Long> followedAuthorIds = resolveFollowedAuthorIds(viewerId, videos);
        return videos.stream()
            .map(v -> toResponse(v, counts, followedAuthorIds.contains(v.getAuthor().getId())))
            .toList();
    }

    private static Map<Long, Long> countMap(List<Object[]> rows) {
        Map<Long, Long> out = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }
            out.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return out;
    }

    private VideoResponse toResponse(Video video, FeedInteractionCounts batch, boolean followedByViewer) {
        Long videoId = video.getId();
        long likeCount = batch != null
            ? batch.likes().getOrDefault(videoId, 0L)
            : likeRepository.countByVideoId(videoId);
        long commentCount = batch != null
            ? batch.comments().getOrDefault(videoId, 0L)
            : commentRepository.countByVideoId(videoId);
        long bookmarkCount = batch != null
            ? batch.bookmarks().getOrDefault(videoId, 0L)
            : videoBookmarkRepository.countByVideo_Id(videoId);
        long viewCount = batch != null
            ? batch.views().getOrDefault(videoId, 0L)
            : videoViewRepository.countByVideo_Id(videoId);
        User author = video.getAuthor();
        String authorDisplayName = resolveAuthorDisplayName(author);
        String videoUrl = presignPlaybackUrlIfConfigured(video.getVideoUrl());
        String thumbUrl = presignPlaybackUrlIfConfigured(video.getThumbnailUrl());
        String audioUrl = presignPlaybackUrlIfConfigured(video.getAudioUrl());
        return new VideoResponse(
            video.getPublicId(),
            author.getId(),
            author.getUsername(),
            authorDisplayName,
            userAvatarResolver.resolve(author),
            video.getTitle(),
            video.getDescription(),
            videoUrl,
            thumbUrl,
            audioUrl,
            video.getAudioTitle(),
            likeCount,
            commentCount,
            bookmarkCount,
            video.getShareCount(),
            viewCount,
            video.getCreatedAt(),
            video.getStatus(),
            video.getMasterPlaylistUrl(),
            video.getDurationSeconds(),
            video.getSourceWidthPx(),
            video.getSourceHeightPx(),
            video.getProcessingError(),
            followedByViewer
        );
    }

    private List<Video> shuffleFeedRows(List<Video> rows) {
        if (rows == null || rows.size() < 2) {
            return rows == null ? List.of() : rows;
        }
        List<Video> shuffled = new ArrayList<>(rows);
        Collections.shuffle(shuffled, ThreadLocalRandom.current());
        return shuffled;
    }

    private FeedPageResponse toFeedPageResponse(Page<Video> page, String sort) {
        return toFeedPageResponse(page, sort, null, null);
    }

    private FeedPageResponse toFeedPageResponse(Page<Video> page, String sort, String nextCursor) {
        return toFeedPageResponse(page, sort, nextCursor, null);
    }

    private FeedPageResponse toFeedPageResponse(
        Page<Video> page,
        String sort,
        String nextCursor,
        Long viewerId
    ) {
        return new FeedPageResponse(
            toFeedResponses(page.getContent(), viewerId),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.hasNext(),
            sort,
            nextCursor
        );
    }
}
