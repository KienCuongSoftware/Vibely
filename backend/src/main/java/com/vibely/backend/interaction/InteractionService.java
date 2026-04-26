package com.vibely.backend.interaction;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.VideoService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InteractionService {

    private final UserRepository userRepository;
    private final VideoService videoService;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;

    public InteractionService(
        UserRepository userRepository,
        VideoService videoService,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        FollowRepository followRepository
    ) {
        this.userRepository = userRepository;
        this.videoService = videoService;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.followRepository = followRepository;
    }

    public void likeVideo(String email, Long videoId) {
        User user = getUser(email);
        Video video = videoService.getVideoOrThrow(videoId);
        if (likeRepository.existsByUserAndVideo(user, video)) {
            return;
        }
        LikeEntity like = new LikeEntity();
        like.setUser(user);
        like.setVideo(video);
        likeRepository.save(like);
    }

    public void unlikeVideo(String email, Long videoId) {
        User user = getUser(email);
        Video video = videoService.getVideoOrThrow(videoId);
        likeRepository.deleteByUserAndVideo(user, video);
    }

    public CommentResponse addComment(String email, Long videoId, String content) {
        User user = getUser(email);
        Video video = videoService.getVideoOrThrow(videoId);
        CommentEntity comment = new CommentEntity();
        comment.setUser(user);
        comment.setVideo(video);
        comment.setContent(content);
        CommentEntity saved = commentRepository.save(comment);
        return toCommentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long videoId) {
        Video video = videoService.getVideoOrThrow(videoId);
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

    public void reportVideo(String email, Long videoId, String reason) {
        getUser(email);
        Video video = videoService.getVideoOrThrow(videoId);
        if (video.getStatus() == VideoStatus.HIDDEN) {
            throw new BadRequestException("Video đã bị ẩn trước đó");
        }
        video.setStatus(VideoStatus.REPORTED);
        video.setReportReason(reason);
        video.setReportedAt(LocalDateTime.now());
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private CommentResponse toCommentResponse(CommentEntity entity) {
        return new CommentResponse(
            entity.getId(),
            entity.getUser().getId(),
            entity.getUser().getUsername(),
            entity.getContent(),
            entity.getCreatedAt()
        );
    }
}
