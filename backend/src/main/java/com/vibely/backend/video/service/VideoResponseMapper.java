package com.vibely.backend.video.service;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.feed.dto.FeedPageResponse;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoBookmarkRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.storage.S3PresignedUploadService;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.FollowingFeedRowView;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoResponse;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

@Component
public class VideoResponseMapper {

    record FeedInteractionCounts(
        Map<Long, Long> likes,
        Map<Long, Long> comments,
        Map<Long, Long> bookmarks,
        Map<Long, Long> views
    ) {
    }

    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final VideoViewRepository videoViewRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final ObjectProvider<S3PresignedUploadService> presignedUploadService;
    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;

    public VideoResponseMapper(
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        VideoViewRepository videoViewRepository,
        UserAvatarResolver userAvatarResolver,
        ObjectProvider<S3PresignedUploadService> presignedUploadService,
        FollowRepository followRepository,
        UserRepository userRepository,
        VideoRepository videoRepository
    ) {
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.videoViewRepository = videoViewRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.presignedUploadService = presignedUploadService;
        this.followRepository = followRepository;
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
    }

    public VideoResponse toResponse(Video video) {
        return toResponse(video, null, false);
    }

    public VideoResponse toResponse(Video video, boolean followedByViewer) {
        return toResponse(video, null, followedByViewer);
    }

    public List<VideoResponse> toFeedResponses(List<Video> videos, Long viewerId) {
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
            .map(v -> toResponse(v, counts, followedAuthorIds.contains(v.getAuthor().getId()), null, null))
            .toList();
    }

    public List<VideoResponse> toFollowingFeedResponses(List<FollowingFeedRowView> rows, Long viewerId) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> videoIds = rows.stream().map(FollowingFeedRowView::getVideoId).distinct().toList();
        Map<Long, Video> videosById = videoRepository.findWithAuthorByIdIn(videoIds).stream()
            .collect(java.util.stream.Collectors.toMap(Video::getId, v -> v, (a, b) -> a));
        List<Long> reposterIds = rows.stream()
            .map(FollowingFeedRowView::getReposterUserId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        Map<Long, User> repostersById = reposterIds.isEmpty()
            ? Map.of()
            : userRepository.findAllById(reposterIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        FeedInteractionCounts counts = new FeedInteractionCounts(
            countMap(likeRepository.countGroupedByVideoIds(videoIds)),
            countMap(commentRepository.countGroupedByVideoIds(videoIds)),
            countMap(videoBookmarkRepository.countGroupedByVideoIds(videoIds)),
            countMap(videoViewRepository.countGroupedByVideoIds(videoIds))
        );
        List<Video> videosForFollow = videosById.values().stream().toList();
        Set<Long> followedAuthorIds = resolveFollowedAuthorIds(viewerId, videosForFollow);
        List<VideoResponse> out = new ArrayList<>(rows.size());
        for (FollowingFeedRowView row : rows) {
            Video video = videosById.get(row.getVideoId());
            if (video == null) {
                continue;
            }
            User reposter = row.getReposterUserId() != null
                ? repostersById.get(row.getReposterUserId())
                : null;
            boolean followed = followedAuthorIds.contains(video.getAuthor().getId())
                || (reposter != null && followedAuthorIds.contains(reposter.getId()));
            out.add(toResponse(video, counts, followed, reposter, row.getFeedAt()));
        }
        return out;
    }

    public FeedPageResponse toFeedPageResponse(Page<Video> page, String sort) {
        return toFeedPageResponse(page, sort, null, null);
    }

    public FeedPageResponse toFeedPageResponse(Page<Video> page, String sort, String nextCursor) {
        return toFeedPageResponse(page, sort, nextCursor, null);
    }

    public FeedPageResponse toFeedPageResponse(
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

    public boolean resolveFollowedByViewer(Video video, String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return false;
        }
        User viewer = userRepository.findByEmail(viewerEmail.trim()).orElse(null);
        if (viewer == null) {
            return false;
        }
        return followRepository.existsByFollowerAndFollowing(viewer, video.getAuthor());
    }

    private VideoResponse toResponse(Video video, FeedInteractionCounts batch, boolean followedByViewer) {
        return toResponse(video, batch, followedByViewer, null, null);
    }

    private VideoResponse toResponse(
        Video video,
        FeedInteractionCounts batch,
        boolean followedByViewer,
        User repostedBy,
        LocalDateTime repostedAt
    ) {
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
        String authorDisplayName = VideoMediaUtils.resolveAuthorDisplayName(author);
        String videoUrl = presignPlaybackUrlIfConfigured(video.getVideoUrl());
        String thumbUrl = presignPlaybackUrlIfConfigured(video.getThumbnailUrl());
        String audioUrl = presignPlaybackUrlIfConfigured(video.getAudioUrl());
        String masterPlaylistUrl = presignPlaybackUrlIfConfigured(video.getMasterPlaylistUrl());
        Long repostedByUserId = null;
        String repostedByUsername = null;
        String repostedByDisplayName = null;
        String repostedByAvatarUrl = null;
        LocalDateTime repostedAtValue = null;
        if (repostedBy != null) {
            repostedByUserId = repostedBy.getId();
            repostedByUsername = repostedBy.getUsername();
            repostedByDisplayName = VideoMediaUtils.resolveAuthorDisplayName(repostedBy);
            repostedByAvatarUrl = userAvatarResolver.resolve(repostedBy);
            repostedAtValue = repostedAt;
        }
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
            masterPlaylistUrl,
            video.getDurationSeconds(),
            video.getSourceWidthPx(),
            video.getSourceHeightPx(),
            video.getProcessingError(),
            followedByViewer,
            repostedByUserId,
            repostedByUsername,
            repostedByDisplayName,
            repostedByAvatarUrl,
            repostedAtValue
        );
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
}
