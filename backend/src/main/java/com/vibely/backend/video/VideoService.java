package com.vibely.backend.video;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.feed.FeedPageResponse;
import com.vibely.backend.feed.FeedSort;
import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.FollowEntity;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;

    public VideoService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        FollowRepository followRepository
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.followRepository = followRepository;
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

    public Video getVideoOrThrow(Long id) {
        return videoRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
    }

    private static String resolveAuthorDisplayName(User author) {
        String raw = author.getDisplayName();
        if (raw != null && !raw.isBlank()) {
            return raw.trim();
        }
        return author.getUsername();
    }

    private VideoResponse toResponse(Video video) {
        long likeCount = likeRepository.countByVideo(video);
        long commentCount = commentRepository.countByVideo(video);
        String authorDisplayName = resolveAuthorDisplayName(video.getAuthor());
        return new VideoResponse(
            video.getId(),
            video.getAuthor().getId(),
            video.getAuthor().getUsername(),
            authorDisplayName,
            video.getTitle(),
            video.getDescription(),
            video.getVideoUrl(),
            video.getThumbnailUrl(),
            likeCount,
            commentCount,
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
