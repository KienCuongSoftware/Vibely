package com.vibely.backend.studio;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.interaction.repository.CommentLikeRepository;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bình luận cấp kênh cho trang Studio → Bình luận. */
@Service
public class StudioCommentsService {

    private static final List<VideoStatus> CHANNEL_VIDEO_STATUSES = List.of(
        VideoStatus.READY,
        VideoStatus.PROCESSING,
        VideoStatus.RAW,
        VideoStatus.FAILED
    );

    private static final int MAX_PAGE_SIZE = 50;
    private static final Set<String> POSTED_BY_MODES = Set.of("all", "me", "others");

    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final FollowRepository followRepository;
    private final UserAvatarResolver userAvatarResolver;

    public StudioCommentsService(
        UserRepository userRepository,
        CommentRepository commentRepository,
        CommentLikeRepository commentLikeRepository,
        FollowRepository followRepository,
        UserAvatarResolver userAvatarResolver
    ) {
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.followRepository = followRepository;
        this.userAvatarResolver = userAvatarResolver;
    }

    @Transactional(readOnly = true)
    public StudioCommentPageResponse getChannelComments(
        String email,
        int page,
        int size,
        String query,
        String postedBy,
        boolean onlyUnreplied,
        long minFollowers,
        String sort
    ) {
        User me = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String safeQuery = query == null ? "" : query.trim();
        String safePostedBy = postedBy == null ? "all" : postedBy.trim().toLowerCase();
        if (!POSTED_BY_MODES.contains(safePostedBy)) {
            safePostedBy = "all";
        }
        Sort order = "oldest".equalsIgnoreCase(sort)
            ? Sort.by(Sort.Direction.ASC, "createdAt")
            : Sort.by(Sort.Direction.DESC, "createdAt");

        Page<CommentEntity> result = commentRepository.searchChannelComments(
            me.getId(),
            CHANNEL_VIDEO_STATUSES,
            safeQuery,
            safePostedBy,
            Math.max(0L, minFollowers),
            onlyUnreplied,
            PageRequest.of(safePage, safeSize, order)
        );

        List<CommentEntity> rows = result.getContent();
        if (rows.isEmpty()) {
            return new StudioCommentPageResponse(
                List.of(), safePage, safeSize, result.getTotalElements(), result.hasNext());
        }

        List<Long> commentIds = rows.stream().map(CommentEntity::getId).toList();
        Set<Long> commenterIds = new LinkedHashSet<>();
        for (CommentEntity c : rows) {
            commenterIds.add(c.getUser().getId());
        }

        Map<Long, Long> likeCounts = toCountMap(commentLikeRepository.countGroupedByCommentIds(commentIds));
        Set<Long> likedIds = new HashSet<>(commentLikeRepository.findLikedCommentIds(me, commentIds));
        Map<Long, Long> replyCounts = toCountMap(commentRepository.countRepliesGroupedByParentIds(commentIds));
        Set<Long> repliedByMe = new HashSet<>(
            commentRepository.findParentIdsRepliedByUser(commentIds, me.getId()));
        Map<Long, Long> followerCounts =
            toCountMap(followRepository.countFollowersGroupedByUserIds(commenterIds));

        List<StudioCommentResponse> items = rows.stream()
            .map((c) -> toResponse(c, me, likeCounts, likedIds, replyCounts, repliedByMe, followerCounts))
            .toList();

        return new StudioCommentPageResponse(
            items, safePage, safeSize, result.getTotalElements(), result.hasNext());
    }

    private StudioCommentResponse toResponse(
        CommentEntity comment,
        User me,
        Map<Long, Long> likeCounts,
        Set<Long> likedIds,
        Map<Long, Long> replyCounts,
        Set<Long> repliedByMe,
        Map<Long, Long> followerCounts
    ) {
        User commenter = comment.getUser();
        Video video = comment.getVideo();
        CommentEntity parent = comment.getParentComment();
        Long commentId = comment.getId();

        return new StudioCommentResponse(
            commentId,
            parent != null ? parent.getId() : null,
            parent != null && parent.getUser() != null ? parent.getUser().getUsername() : null,
            comment.getContent(),
            comment.getCreatedAt() != null
                ? comment.getCreatedAt().atZone(ZoneOffset.UTC).toInstant()
                : null,
            commenter.getId(),
            commenter.getUsername(),
            commenter.getDisplayName(),
            userAvatarResolver.resolve(commenter),
            followerCounts.getOrDefault(commenter.getId(), 0L),
            likeCounts.getOrDefault(commentId, 0L),
            likedIds.contains(commentId),
            Objects.equals(commenter.getId(), me.getId()),
            repliedByMe.contains(commentId),
            replyCounts.getOrDefault(commentId, 0L),
            video.getPublicId(),
            video.getTitle(),
            video.getDescription(),
            video.getThumbnailUrl()
        );
    }

    private Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) continue;
            map.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return map;
    }
}
