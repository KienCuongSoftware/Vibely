package com.vibely.backend.video.service;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.common.SqlSafe;
import com.vibely.backend.discovery.service.UserInterestSignalProcessor;
import com.vibely.backend.discovery.service.VideoEngagementStatsService;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.feed.FeedCursorCodec;
import com.vibely.backend.feed.dto.FeedPageResponse;
import com.vibely.backend.feed.FeedSort;
import com.vibely.backend.interaction.entity.VideoViewEntity;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoBookmarkRepository;
import com.vibely.backend.interaction.repository.VideoRepostRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.user.service.ProfileVisibilityService;
import com.vibely.backend.user.service.UsernameService;
import com.vibely.backend.video.FollowingFeedRowView;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.VideoViewRequest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoFeedService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final VideoRepostRepository videoRepostRepository;
    private final FollowRepository followRepository;
    private final UsernameService usernameService;
    private final com.vibely.backend.storage.S3ObjectUrlBuilder objectUrlBuilder;
    private final VideoResponseMapper responseMapper;
    private final ProfileVisibilityService profileVisibilityService;
    private final VideoPrivacyAccessService privacyAccessService;

    public VideoFeedService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        LikeRepository likeRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        VideoRepostRepository videoRepostRepository,
        FollowRepository followRepository,
        UsernameService usernameService,
        com.vibely.backend.storage.S3ObjectUrlBuilder objectUrlBuilder,
        VideoResponseMapper responseMapper,
        ProfileVisibilityService profileVisibilityService,
        VideoPrivacyAccessService privacyAccessService
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.videoRepostRepository = videoRepostRepository;
        this.followRepository = followRepository;
        this.usernameService = usernameService;
        this.objectUrlBuilder = objectUrlBuilder;
        this.responseMapper = responseMapper;
        this.profileVisibilityService = profileVisibilityService;
        this.privacyAccessService = privacyAccessService;
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getFeed(int page, int size, FeedSort sort, String viewerEmail) {
        Pageable pageable = PageRequest.of(page, size);
        Long viewerId = resolveViewerId(viewerEmail);
        if (sort == FeedSort.TRENDING_LITE) {
            Page<Video> resultPage = videoRepository.findTrendingByStatus(VideoStatus.READY, pageable);
            return responseMapper.toFeedPageResponse(resultPage, sort.name().toLowerCase(), null, viewerId);
        }
        Page<Video> resultPage = videoRepository.findByStatusOrderByCreatedAtDesc(VideoStatus.READY, pageable);
        String nextCursor = null;
        if (resultPage.hasNext() && !resultPage.getContent().isEmpty()) {
            Video last = resultPage.getContent().get(resultPage.getContent().size() - 1);
            nextCursor = FeedCursorCodec.encode(last.getCreatedAt(), last.getId());
        }
        return responseMapper.toFeedPageResponse(resultPage, sort.name().toLowerCase(), nextCursor, viewerId);
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
            responseMapper.toFeedResponses(rows, viewerId),
            0,
            req,
            hasNext ? -1L : rows.size(),
            hasNext,
            "latest",
            next
        );
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getForYouFeed(String viewerEmail, int size, String cursor) {
        FeedPageResponse latest = getLatestFeedKeyset(cursor, size, viewerEmail);
        return withFeedSort(latest, "for-you");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getFollowingFeed(String email, int page, int size) {
        User follower = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        if (followRepository.countByFollower_Id(follower.getId()) == 0) {
            return new FeedPageResponse(Collections.emptyList(), page, size, 0, false, "following", null);
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Page<FollowingFeedRowView> slice = videoRepository.findFollowingFeedCombined(
            follower.getId(),
            pageable
        );
        List<VideoResponse> items = responseMapper.toFollowingFeedResponses(slice.getContent(), follower.getId());
        return new FeedPageResponse(
            items,
            slice.getNumber(),
            slice.getSize(),
            slice.getTotalElements(),
            slice.hasNext(),
            "following",
            null
        );
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getVideosByAudio(String audioUrl, int page, int size) {
        String normalizedAudioUrl = VideoMediaUtils.normalizeText(audioUrl);
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
        return responseMapper.toFeedPageResponse(resultPage, "sound");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getVideosByHashtag(String tag, int page, int size) {
        String normalizedTag = VideoMediaUtils.normalizeHashtag(tag);
        if (normalizedTag == null) {
            throw new BadRequestException("Thiếu hashtag.");
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 60));
        Page<Video> resultPage = videoRepository.findByHashtag(
            VideoStatus.READY.name(),
            SqlSafe.escapeRegexLiteral(normalizedTag),
            pageable
        );
        return responseMapper.toFeedPageResponse(resultPage, "hashtag");
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
        return responseMapper.toFeedPageResponse(resultPage, "liked");
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
        return responseMapper.toFeedPageResponse(resultPage, "bookmarks");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getMyRepostedVideos(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        VideoStatus ready = VideoStatus.READY;
        VideoStatus removed = VideoStatus.REMOVED;
        VideoStatus failed = VideoStatus.FAILED;
        Page<Video> resultPage = videoRepostRepository.findRepostedVideosForUser(
            user,
            ready,
            user.getId(),
            removed,
            failed,
            pageable
        );
        return responseMapper.toFeedPageResponse(resultPage, "reposts");
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
        return responseMapper.toFeedPageResponse(resultPage, "my-uploads");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getPublicVideosForUsername(
        String rawUsername,
        int page,
        int size,
        Authentication authentication
    ) {
        String normalized = usernameService.normalize(rawUsername);
        User author = userRepository.findByUsername(normalized)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        User viewer = resolveViewer(authentication);
        if (!profileVisibilityService.canViewProfileContent(author, viewer)) {
            int cappedSize = Math.min(size, 50);
            return new FeedPageResponse(List.of(), page, cappedSize, 0, false, "profile-uploads", null);
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        boolean isAuthor = viewer != null && Objects.equals(viewer.getId(), author.getId());
        boolean mutualFriends = !isAuthor && viewer != null && privacyAccessService.isMutualFriends(viewer, author);
        Page<Video> resultPage;
        if (isAuthor) {
            resultPage = videoRepository.findProfileVideosForAuthor(author.getId(), VideoStatus.READY, pageable);
        } else if (mutualFriends) {
            resultPage = videoRepository.findProfilePublicOrFriendsVideos(
                author.getId(),
                VideoStatus.READY,
                pageable
            );
        } else {
            // Anonymous + non-friends: PUBLIC only (never FRIENDS / PRIVATE).
            resultPage = videoRepository.findProfilePublicVideos(
                author.getId(),
                VideoStatus.READY,
                pageable
            );
        }
        // Defense in depth: never return a row the privacy service would deny.
        List<Video> visible = resultPage.getContent().stream()
            .filter(v -> privacyAccessService.canViewerWatch(v, viewer))
            .toList();
        if (visible.size() != resultPage.getContent().size()) {
            resultPage = new PageImpl<>(visible, pageable, visible.size());
        }
        return responseMapper.toFeedPageResponse(resultPage, "profile-uploads");
    }

    private User resolveViewer(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName()).orElse(null);
    }

    private FeedPageResponse withFeedSort(FeedPageResponse page, String sort) {
        return new FeedPageResponse(
            page.items(),
            page.page(),
            page.size(),
            page.total(),
            page.hasNext(),
            sort,
            page.nextCursor()
        );
    }

    private Long resolveViewerId(String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(viewerEmail.trim())
            .map(User::getId)
            .orElse(null);
    }

    private List<Video> shuffleFeedRows(List<Video> rows) {
        if (rows == null || rows.size() < 2) {
            return rows == null ? List.of() : rows;
        }
        List<Video> shuffled = new ArrayList<>(rows);
        Collections.shuffle(shuffled, ThreadLocalRandom.current());
        return shuffled;
    }
}
