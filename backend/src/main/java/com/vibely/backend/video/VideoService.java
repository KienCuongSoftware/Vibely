package com.vibely.backend.video;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.feed.FeedPageResponse;
import com.vibely.backend.feed.FeedSort;
import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.FollowEntity;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoViewEntity;
import com.vibely.backend.interaction.VideoViewRepository;
import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.interaction.VideoBookmarkRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.user.UsernameService;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoService {
    private static final Pattern VIDEO_EXT_PATTERN = Pattern.compile("\\.(mp4|webm|mov)(\\?.*)?$", Pattern.CASE_INSENSITIVE);

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;
    private final VideoViewRepository videoViewRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final UsernameService usernameService;

    public VideoService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        LikeRepository likeRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        CommentRepository commentRepository,
        FollowRepository followRepository,
        VideoViewRepository videoViewRepository,
        UserAvatarResolver userAvatarResolver,
        UsernameService usernameService
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
    }

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
        video.setStatus(VideoStatus.ACTIVE);
        Video saved = videoRepository.save(video);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getFeed(int page, int size, FeedSort sort) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Video> resultPage = sort == FeedSort.TRENDING_LITE
            ? videoRepository.findTrendingByStatus(VideoStatus.ACTIVE, pageable)
            : videoRepository.findByStatusOrderByCreatedAtDesc(VideoStatus.ACTIVE, pageable);
        return toFeedPageResponse(resultPage, sort.name().toLowerCase());
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getFollowingFeed(String email, int page, int size) {
        User follower = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        List<User> followedUsers = followRepository.findByFollower(follower).stream()
            .map(FollowEntity::getFollowing)
            .toList();
        if (followedUsers.isEmpty()) {
            return new FeedPageResponse(Collections.emptyList(), page, size, 0, false, "following");
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<Video> resultPage = videoRepository.findByAuthorInAndStatusOrderByCreatedAtDesc(
            followedUsers,
            VideoStatus.ACTIVE,
            pageable
        );
        return toFeedPageResponse(resultPage, "following");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getVideosByAudio(String audioUrl, int page, int size) {
        String normalizedAudioUrl = normalizeText(audioUrl);
        if (normalizedAudioUrl == null) {
            throw new BadRequestException("Thiếu đường dẫn âm thanh.");
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Page<Video> resultPage = videoRepository.findByAudioUrlAndStatusOrderByCreatedAtDesc(
            normalizedAudioUrl,
            VideoStatus.ACTIVE,
            pageable
        );
        return toFeedPageResponse(resultPage, "sound");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getMyLikedVideos(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Page<Video> resultPage = likeRepository.findLikedVideosForUser(user, VideoStatus.ACTIVE, pageable);
        return toFeedPageResponse(resultPage, "liked");
    }

    @Transactional(readOnly = true)
    public FeedPageResponse getMyBookmarkedVideos(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        Page<Video> resultPage = videoBookmarkRepository.findBookmarkedVideosForUser(
            user,
            VideoStatus.ACTIVE,
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
            VideoStatus.ACTIVE,
            pageable
        );
        return toFeedPageResponse(resultPage, "profile-uploads");
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideoByIdPublic(Long id) {
        Video video = getVideoOrThrow(id);
        if (video.getStatus() != VideoStatus.ACTIVE) {
            throw new NotFoundException("Không tìm thấy video");
        }
        return toResponse(video);
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
        Video saved = videoRepository.save(video);
        return toResponse(saved);
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

    public Video getVideoOrThrow(Long id) {
        return videoRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
    }

    public void recordView(Long id) {
        Video video = getVideoOrThrow(id);
        if (video.getStatus() != VideoStatus.ACTIVE) {
            return;
        }
        VideoViewEntity row = new VideoViewEntity();
        row.setVideo(video);
        videoViewRepository.save(row);
    }

    @Transactional
    public void recordShare(Long videoId) {
        videoRepository.incrementShareCount(videoId, VideoStatus.ACTIVE);
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

    private static String deriveAudioUrlFromVideoUrl(String videoUrl) {
        String normalizedVideoUrl = normalizeText(videoUrl);
        if (normalizedVideoUrl == null) return null;
        String mp3 = VIDEO_EXT_PATTERN.matcher(normalizedVideoUrl).replaceFirst(".mp3$2");
        if (mp3.equals(normalizedVideoUrl)) {
            return null;
        }
        return mp3.replace("/uploads/", "/audios/");
    }

    private VideoResponse toResponse(Video video) {
        Long videoId = video.getId();
        long likeCount = likeRepository.countByVideoId(videoId);
        long commentCount = commentRepository.countByVideoId(videoId);
        long bookmarkCount = videoBookmarkRepository.countByVideo_Id(videoId);
        User author = video.getAuthor();
        String authorDisplayName = resolveAuthorDisplayName(author);
        return new VideoResponse(
            video.getId(),
            author.getId(),
            author.getUsername(),
            authorDisplayName,
            userAvatarResolver.resolve(author),
            video.getTitle(),
            video.getDescription(),
            video.getVideoUrl(),
            video.getThumbnailUrl(),
            video.getAudioUrl(),
            video.getAudioTitle(),
            likeCount,
            commentCount,
            bookmarkCount,
            video.getShareCount(),
            video.getCreatedAt()
        );
    }

    private FeedPageResponse toFeedPageResponse(Page<Video> page, String sort) {
        return new FeedPageResponse(
            page.getContent().stream().map(this::toResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.hasNext(),
            sort
        );
    }
}
