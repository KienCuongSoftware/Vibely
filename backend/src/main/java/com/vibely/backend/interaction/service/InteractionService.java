package com.vibely.backend.interaction.service;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.discovery.service.UserInterestSignalProcessor;
import com.vibely.backend.discovery.service.VideoEngagementStatsService;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.interaction.dto.CommentResponse;
import com.vibely.backend.interaction.dto.FriendMentionResponse;
import com.vibely.backend.interaction.dto.VideoMeStateResponse;
import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.interaction.entity.CommentLikeEntity;
import com.vibely.backend.interaction.entity.FollowEntity;
import com.vibely.backend.interaction.entity.FollowStatus;
import com.vibely.backend.interaction.entity.LikeEntity;
import com.vibely.backend.interaction.entity.VideoBookmarkEntity;
import com.vibely.backend.interaction.entity.VideoRepostEntity;
import com.vibely.backend.interaction.repository.CommentLikeRepository;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoBookmarkRepository;
import com.vibely.backend.interaction.repository.VideoRepostRepository;
import com.vibely.backend.notification.NotificationService;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.user.service.ProfileVisibilityService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.service.VideoService;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InteractionService {

    private final UserRepository userRepository;
    private final VideoService videoService;
    private final LikeRepository likeRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final VideoRepostRepository videoRepostRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final FollowRepository followRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final ExploreCacheService exploreCacheService;
    private final ObjectProvider<UserInterestSignalProcessor> userInterestSignalProcessor;
    private final ObjectProvider<VideoEngagementStatsService> videoEngagementStatsService;
    private final VideoRepository videoRepository;
    private final NotificationService notificationService;
    private final ProfileVisibilityService profileVisibilityService;

    public InteractionService(
        UserRepository userRepository,
        VideoService videoService,
        LikeRepository likeRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        VideoRepostRepository videoRepostRepository,
        CommentRepository commentRepository,
        CommentLikeRepository commentLikeRepository,
        FollowRepository followRepository,
        UserAvatarResolver userAvatarResolver,
        ExploreCacheService exploreCacheService,
        ObjectProvider<UserInterestSignalProcessor> userInterestSignalProcessor,
        ObjectProvider<VideoEngagementStatsService> videoEngagementStatsService,
        VideoRepository videoRepository,
        NotificationService notificationService,
        ProfileVisibilityService profileVisibilityService
    ) {
        this.userRepository = userRepository;
        this.videoService = videoService;
        this.likeRepository = likeRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.videoRepostRepository = videoRepostRepository;
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.followRepository = followRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.exploreCacheService = exploreCacheService;
        this.userInterestSignalProcessor = userInterestSignalProcessor;
        this.videoEngagementStatsService = videoEngagementStatsService;
        this.videoRepository = videoRepository;
        this.notificationService = notificationService;
        this.profileVisibilityService = profileVisibilityService;
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
        notificationService.onVideoLike(user, video);
        userInterestSignalProcessor.ifAvailable(p -> p.onLike(user.getId(), video));
        refreshExploreFor(video);
    }

    public void unlikeVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        likeRepository.deleteByUserAndVideo(user, video);
        notificationService.onVideoUnlike(user, video);
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
        userInterestSignalProcessor.ifAvailable(p -> p.onSave(user.getId(), video));
    }

    public void unbookmarkVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        videoBookmarkRepository.deleteByUserAndVideo(user, video);
    }

    public void repostVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        if (videoRepostRepository.existsByUserAndVideo(user, video)) {
            return;
        }
        VideoRepostEntity row = new VideoRepostEntity();
        row.setUser(user);
        row.setVideo(video);
        videoRepostRepository.save(row);
    }

    public void unrepostVideo(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        videoRepostRepository.deleteByUserAndVideo(user, video);
    }

    @Transactional(readOnly = true)
    public VideoMeStateResponse getVideoMeState(String email, UUID videoPublicId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        return new VideoMeStateResponse(
            likeRepository.existsByUserAndVideo(user, video),
            videoBookmarkRepository.existsByUserAndVideo(user, video),
            videoRepostRepository.existsByUserAndVideo(user, video)
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
        if (parentCommentId != null && comment.getParentComment() != null) {
            notificationService.onCommentReply(user, saved, comment.getParentComment(), video);
        }
        notificationService.onMentions(user, saved, video, content);
        userInterestSignalProcessor.ifAvailable(p -> p.onComment(user.getId(), video));
        refreshExploreFor(video);
        return toCommentResponse(saved, 0L, false);
    }

    public void likeComment(String email, UUID videoPublicId, Long commentId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        CommentEntity comment = commentRepository
            .findById(commentId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy bình luận"));
        if (!comment.getVideo().getId().equals(video.getId())) {
            throw new BadRequestException("Bình luận không thuộc video này.");
        }
        if (commentLikeRepository.existsByUserAndComment(user, comment)) {
            return;
        }
        CommentLikeEntity like = new CommentLikeEntity();
        like.setUser(user);
        like.setComment(comment);
        commentLikeRepository.save(like);
        notificationService.onCommentLike(user, comment, video);
    }

    public void unlikeComment(String email, UUID videoPublicId, Long commentId) {
        User user = getUser(email);
        Video video = videoService.getVideoByPublicIdOrThrow(videoPublicId);
        requireEngagementAllowed(video, user);
        CommentEntity comment = commentRepository
            .findById(commentId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy bình luận"));
        if (!comment.getVideo().getId().equals(video.getId())) {
            throw new BadRequestException("Bình luận không thuộc video này.");
        }
        commentLikeRepository.deleteByUserAndComment(user, comment);
        notificationService.onCommentUnlike(user, comment);
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
     * {@link VideoQueryService#getVideoByIdForViewer(Long, String)}).
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
        List<CommentEntity> entities = commentRepository.findByVideoOrderByCreatedAtDesc(video);
        if (entities.isEmpty()) {
            return List.of();
        }
        List<Long> ids = entities.stream().map(CommentEntity::getId).toList();
        Map<Long, Long> likeCounts = new LinkedHashMap<>();
        for (Object[] row : commentLikeRepository.countGroupedByCommentIds(ids)) {
            likeCounts.put((Long) row[0], (Long) row[1]);
        }
        Set<Long> likedIds = new HashSet<>();
        if (viewer != null) {
            likedIds.addAll(commentLikeRepository.findLikedCommentIds(viewer, ids));
        }
        return entities.stream()
            .map(entity -> toCommentResponse(
                entity,
                likeCounts.getOrDefault(entity.getId(), 0L),
                likedIds.contains(entity.getId())
            ))
            .toList();
    }

    public void follow(String email, Long followingUserId) {
        User follower = getUser(email);
        User following = userRepository.findById(followingUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng cần theo dõi"));
        if (follower.getId().equals(following.getId())) {
            throw new BadRequestException("Bạn không thể tự theo dõi chính mình");
        }
        if (followRepository.existsAcceptedByFollowerAndFollowing(follower, following)) {
            return;
        }
        FollowEntity follow = followRepository.findByFollowerAndFollowing(follower, following)
            .orElseGet(FollowEntity::new);
        follow.setFollower(follower);
        follow.setFollowing(following);
        follow.setStatus(FollowStatus.ACCEPTED);
        followRepository.save(follow);
        notificationService.onFollow(follower, following);
        List<Video> recentVideos = videoRepository.findByAuthorIdAndStatusEquals(
            following.getId(),
            VideoStatus.READY,
            PageRequest.of(0, 5)
        ).getContent();
        userInterestSignalProcessor.ifAvailable(p -> p.onFollowCreator(follower.getId(), following.getId(), recentVideos));
    }

    public void unfollow(String email, Long followingUserId) {
        User follower = getUser(email);
        User following = userRepository.findById(followingUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng cần bỏ theo dõi"));
        FollowEntity existing = followRepository.findByFollowerAndFollowing(follower, following).orElse(null);
        if (existing == null) {
            return;
        }
        followRepository.delete(existing);
        if (existing.getStatus() == FollowStatus.ACCEPTED) {
            notificationService.onUnfollow(follower, following);
        } else {
            notificationService.onFollowRequestCancelled(follower, following);
        }
    }

    public void acceptFollowRequest(String email, Long followerUserId) {
        User owner = getUser(email);
        User follower = userRepository.findById(followerUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        FollowEntity follow = followRepository.findByFollowerAndFollowing(follower, owner)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu follow"));
        if (follow.getStatus() != FollowStatus.PENDING) {
            throw new BadRequestException("Yêu cầu follow không còn hiệu lực");
        }
        follow.setStatus(FollowStatus.ACCEPTED);
        followRepository.save(follow);
        notificationService.onFollowRequestAccepted(follower, owner);
        notificationService.onFollow(follower, owner);
        List<Video> recentVideos = videoRepository.findByAuthorIdAndStatusEquals(
            owner.getId(),
            VideoStatus.READY,
            PageRequest.of(0, 5)
        ).getContent();
        userInterestSignalProcessor.ifAvailable(p -> p.onFollowCreator(follower.getId(), owner.getId(), recentVideos));
    }

    public void rejectFollowRequest(String email, Long followerUserId) {
        User owner = getUser(email);
        User follower = userRepository.findById(followerUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        FollowEntity follow = followRepository.findByFollowerAndFollowing(follower, owner)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu follow"));
        if (follow.getStatus() != FollowStatus.PENDING) {
            throw new BadRequestException("Yêu cầu follow không còn hiệu lực");
        }
        followRepository.delete(follow);
        notificationService.onFollowRequestCancelled(follower, owner);
    }

    @Transactional(readOnly = true)
    public List<FriendMentionResponse> getMutualFriends(String email) {
        User me = getUser(email);
        List<FollowEntity> myFollowing = followRepository.findByFollower(me);
        Map<Long, FriendMentionResponse> friends = new LinkedHashMap<>();
        for (FollowEntity relation : myFollowing) {
            User candidate = relation.getFollowing();
            if (candidate == null || candidate.getId() == null) continue;
            if (!followRepository.existsAcceptedByFollowerAndFollowing(candidate, me)) continue;
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

    private CommentResponse toCommentResponse(
        CommentEntity entity,
        long likeCount,
        boolean likedByViewer
    ) {
        CommentEntity parent = entity.getParentComment();
        Long parentId = parent != null ? parent.getId() : null;
        return new CommentResponse(
            entity.getId(),
            entity.getUser().getId(),
            entity.getUser().getUsername(),
            entity.getContent(),
            entity.getCreatedAt() != null
                ? entity.getCreatedAt().atZone(ZoneOffset.UTC).toInstant()
                : null,
            userAvatarResolver.resolve(entity.getUser()),
            parentId,
            likeCount,
            likedByViewer
        );
    }

    private void refreshExploreFor(Video video) {
        videoEngagementStatsService.ifAvailable(s -> s.recomputeSafely(video));
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:" + video.getPublicId());
    }
}
