package com.vibely.backend.interaction;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.explore.service.ExploreRankingService;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.VideoService;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InteractionService {

    private final UserRepository userRepository;
    private final VideoService videoService;
    private final LikeRepository likeRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final ExploreRankingService exploreRankingService;
    private final ExploreCacheService exploreCacheService;

    public InteractionService(
        UserRepository userRepository,
        VideoService videoService,
        LikeRepository likeRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        CommentRepository commentRepository,
        FollowRepository followRepository,
        UserAvatarResolver userAvatarResolver,
        ExploreRankingService exploreRankingService,
        ExploreCacheService exploreCacheService
    ) {
        this.userRepository = userRepository;
        this.videoService = videoService;
        this.likeRepository = likeRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.commentRepository = commentRepository;
        this.followRepository = followRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.exploreRankingService = exploreRankingService;
        this.exploreCacheService = exploreCacheService;
    }

    public void likeVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        if (likeRepository.existsByUserAndVideo(user, video)) {
            return;
        }
        LikeEntity like = new LikeEntity();
        like.setUser(user);
        like.setVideo(video);
        likeRepository.save(like);
        refreshExploreFor(video);
    }

    public void unlikeVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        likeRepository.deleteByUserAndVideo(user, video);
        refreshExploreFor(video);
    }

    public void bookmarkVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        if (videoBookmarkRepository.existsByUserAndVideo(user, video)) {
            return;
        }
        VideoBookmarkEntity row = new VideoBookmarkEntity();
        row.setUser(user);
        row.setVideo(video);
        videoBookmarkRepository.save(row);
    }

    public void unbookmarkVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        videoBookmarkRepository.deleteByUserAndVideo(user, video);
    }

    @Transactional(readOnly = true)
    public VideoMeStateResponse getVideoMeState(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        return new VideoMeStateResponse(
            likeRepository.existsByUserAndVideo(user, video),
            videoBookmarkRepository.existsByUserAndVideo(user, video)
        );
    }

    public CommentResponse addComment(String email, UUID videoPublicId, String content, Long parentCommentId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        CommentEntity comment = new CommentEntity();
        comment.setUser(user);
        comment.setVideo(video);
        comment.setContent(content);
        if (parentCommentId != null) {
            CommentEntity parent = commentRepository
                .findById(parentCommentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bình luận gốc"));
            if (!parent.getVideo().getId().equals(video.getId())) {
                throw new BadRequestException("Bình luận gốc không thuộc video này.");
            }
            comment.setParentComment(parent);
        }
        CommentEntity saved = commentRepository.save(comment);
        refreshExploreFor(video);
        return toCommentResponse(saved);
    }

    /**
     * Xóa một bình luận; các phản hồi trỏ tới nó bị xóa theo CASCADE ở DB (toàn bộ nhánh con).
     * Chỉ chủ video hoặc chủ bình luận được phép.
     */
    public void deleteComment(String email, UUID videoPublicId, Long commentId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        CommentEntity comment = commentRepository
            .findById(commentId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy bình luận"));
        if (!comment.getVideo().getId().equals(video.getId())) {
            throw new BadRequestException("Bình luận không thuộc video này.");
        }
        Long authorId = video.getAuthor() != null ? video.getAuthor().getId() : null;
        boolean isVideoAuthor = authorId != null && authorId.equals(user.getId());
        boolean isCommentAuthor = comment.getUser().getId().equals(user.getId());
        if (!isVideoAuthor && !isCommentAuthor) {
            throw new BadRequestException("Bạn không thể xóa bình luận này.");
        }
        commentRepository.delete(comment);
        refreshExploreFor(video);
    }

    /**
     * Công khai khi video {@link VideoStatus#READY}; bản nháp/xử lý chỉ tác giả (khớp luật xem trong
     * {@link VideoService#getVideoByIdForViewer(Long, String)}).
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(UUID videoPublicId, String viewerEmail) {
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        User viewer = null;
        if (viewerEmail != null && !viewerEmail.isBlank()) {
            viewer = userRepository.findByEmail(viewerEmail.trim()).orElse(null);
        }
        if (!canViewComments(video, viewer)) {
            return List.of();
        }
        return commentRepository.findByVideoOrderByCreatedAtDesc(video).stream()
            .map(this::toCommentResponse)
            .toList();
    }

    public void follow(String email, Long followingUserId) {
        User follower = getUser(email);
        User following = userRepository.findById(followingUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng cần theo dõi"));
        if (follower.getId().equals(following.getId())) {
            throw new BadRequestException("Bạn không thể tự theo dõi chính mình");
        }
        if (followRepository.existsByFollowerAndFollowing(follower, following)) {
            return;
        }
        FollowEntity follow = new FollowEntity();
        follow.setFollower(follower);
        follow.setFollowing(following);
        followRepository.save(follow);
    }

    public void unfollow(String email, Long followingUserId) {
        User follower = getUser(email);
        User following = userRepository.findById(followingUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng cần bỏ theo dõi"));
        followRepository.deleteByFollowerAndFollowing(follower, following);
    }

    @Transactional(readOnly = true)
    public List<FriendMentionResponse> getMutualFriends(String email) {
        User me = getUser(email);
        List<FollowEntity> myFollowing = followRepository.findByFollower(me);
        Map<Long, FriendMentionResponse> friends = new LinkedHashMap<>();
        for (FollowEntity relation : myFollowing) {
            User candidate = relation.getFollowing();
            if (candidate == null || candidate.getId() == null) continue;
            if (!followRepository.existsByFollowerAndFollowing(candidate, me)) continue;
            friends.put(
                candidate.getId(),
                new FriendMentionResponse(
                    candidate.getId(),
                    candidate.getUsername(),
                    candidate.getDisplayName(),
                    candidate.getAvatarUrl()
                )
            );
        }
        return List.copyOf(friends.values());
    }

    public void reportVideo(String email, UUID videoPublicId, String reason) {
        getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        if (video.getStatus() == VideoStatus.HIDDEN) {
            throw new BadRequestException("Video đã bị ẩn trước đó");
        }
        if (video.getStatus() != VideoStatus.READY) {
            throw new BadRequestException("Chỉ có thể báo cáo video đang công khai.");
        }
        video.setStatus(VideoStatus.REPORTED);
        video.setReportReason(reason);
        video.setReportedAt(LocalDateTime.now());
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    /**
     * Thích / lưu / bình luận: công khai chỉ khi READY; tác giả được tương tác khi video còn RAW/PROCESSING
     * (đang xử lý) hoặc HIDDEN/REPORTED (chỉ chủ bài).
     */
    private static void requireEngagementAllowed(Video video, User actor) {
        VideoStatus s = video.getStatus();
        if (s == VideoStatus.REMOVED || s == VideoStatus.FAILED) {
            throw new BadRequestException("Video không khả dụng.");
        }
        Long authorId = video.getAuthor() != null ? video.getAuthor().getId() : null;
        boolean isAuthor = authorId != null && Objects.equals(authorId, actor.getId());
        if (s == VideoStatus.HIDDEN || s == VideoStatus.REPORTED) {
            if (!isAuthor) {
                throw new BadRequestException("Video không khả dụng.");
            }
            return;
        }
        if (s == VideoStatus.READY) {
            return;
        }
        if (!isAuthor) {
            throw new BadRequestException("Video chưa sẵn sàng hoặc không khả dụng.");
        }
    }

    private static boolean canViewComments(Video video, User viewer) {
        VideoStatus s = video.getStatus();
        if (s == VideoStatus.REMOVED || s == VideoStatus.FAILED) {
            return false;
        }
        if (s == VideoStatus.READY) {
            return true;
        }
        if (viewer == null) {
            return false;
        }
        Long authorId = video.getAuthor() != null ? video.getAuthor().getId() : null;
        return authorId != null && Objects.equals(authorId, viewer.getId());
    }

    private CommentResponse toCommentResponse(CommentEntity entity) {
        CommentEntity parent = entity.getParentComment();
        Long parentId = parent != null ? parent.getId() : null;
        return new CommentResponse(
            entity.getId(),
            entity.getUser().getId(),
            entity.getUser().getUsername(),
            entity.getContent(),
            entity.getCreatedAt(),
            userAvatarResolver.resolve(entity.getUser()),
            parentId
        );
    }

    private void refreshExploreFor(Video video) {
        exploreRankingService.recomputeVideo(video);
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:" + video.getPublicId());
    }
}
