package com.vibely.backend.studio;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.interaction.repository.CommentLikeRepository;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
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
    private static final Set<String> POSTED_BY_MODES =
        Set.of("all", "followers", "non_followers");
    private static final Set<String> REPLY_STATUSES =
        Set.of("all", "unreplied", "replied");
    private static final Set<String> FOLLOWER_BANDS =
        Set.of("lt5k", "5k10k", "10k100k", "gte100k");

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
        String replyStatus,
        String followerBands,
        String from,
        String to,
        String sort
    ) {
        User me = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String safeQuery = query == null ? "" : query.trim();
        String safePostedBy = postedBy == null ? "all" : postedBy.trim().toLowerCase();
        if (!POSTED_BY_MODES.contains(safePostedBy)) {
            safePostedBy = "all";
        }
        String safeReplyStatus =
            replyStatus == null ? "all" : replyStatus.trim().toLowerCase();
        if (!REPLY_STATUSES.contains(safeReplyStatus)) {
            safeReplyStatus = "all";
        }
        Set<String> bands = parseFollowerBands(followerBands);
        LocalDateTime fromDate = parseDateOrDefault(from, LocalDate.of(1970, 1, 1))
            .atStartOfDay();
        LocalDateTime toExclusive = parseDateOrDefault(to, LocalDate.of(9998, 12, 31))
            .plusDays(1)
            .atStartOfDay();
        if (!fromDate.isBefore(toExclusive)) {
            throw new BadRequestException("Invalid comment date range");
        }
        Sort order = "oldest".equalsIgnoreCase(sort)
            ? Sort.by(Sort.Direction.ASC, "createdAt")
            : Sort.by(Sort.Direction.DESC, "createdAt");

        Page<CommentEntity> result = commentRepository.searchChannelComments(
            me.getId(),
            CHANNEL_VIDEO_STATUSES,
            safeQuery,
            safePostedBy,
            !bands.isEmpty(),
            bands.contains("lt5k"),
            bands.contains("5k10k"),
            bands.contains("10k100k"),
            bands.contains("gte100k"),
            safeReplyStatus,
            fromDate,
            toExclusive,
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

    private Set<String> parseFollowerBands(String raw) {
        if (raw == null || raw.isBlank()) return Set.of();
        Set<String> parsed = new HashSet<>();
        Arrays.stream(raw.split(","))
            .map(String::trim)
            .map(String::toLowerCase)
            .filter(FOLLOWER_BANDS::contains)
            .forEach(parsed::add);
        return parsed;
    }

    private LocalDate parseDateOrDefault(String raw, LocalDate fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Comment date must be in YYYY-MM-DD format.");
        }
    }
}
