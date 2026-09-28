package com.vibely.backend.live.service;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.dto.LiveCommentPageResponse;
import com.vibely.backend.live.dto.LiveCommentRequest;
import com.vibely.backend.live.dto.LiveCommentResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveComment;
import com.vibely.backend.live.entity.LiveRestrictionType;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.realtime.LiveEventType;
import com.vibely.backend.live.realtime.LiveRealtimeStore;
import com.vibely.backend.live.repository.LiveCommentRepository;
import com.vibely.backend.user.entity.User;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** LIVE chat: persisted first, then broadcast; the database is the source of truth. */
@Service
public class LiveCommentService {

    private static final Logger log = LoggerFactory.getLogger(LiveCommentService.class);
    private static final Pattern CLIENT_ID = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    /** live_comments.content is VARCHAR(500). */
    private static final int MAX_STORED_LENGTH = 500;

    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final LiveCommentRepository commentRepository;
    private final LiveRealtimeStore store;
    private final LiveEventPublisher publisher;
    private final LiveResponseMapper mapper;
    private final LiveProperties properties;

    public LiveCommentService(
        LiveActorResolver actorResolver,
        LiveAccessService accessService,
        LiveCommentRepository commentRepository,
        LiveRealtimeStore store,
        LiveEventPublisher publisher,
        LiveResponseMapper mapper,
        LiveProperties properties
    ) {
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.commentRepository = commentRepository;
        this.store = store;
        this.publisher = publisher;
        this.mapper = mapper;
        this.properties = properties;
    }

    public LiveCommentResponse create(Authentication authentication, String liveId, LiveCommentRequest request) {
        User author = actorResolver.require(authentication);
        Live live = accessService.requireViewable(liveId, author);
        if (live.getStatus() != LiveStatus.LIVE) {
            throw new LiveException(LiveErrorCode.LIVE_NOT_ACTIVE);
        }
        boolean isHost = live.isHostedBy(author);
        if (!live.isAllowComments() && !isHost) {
            throw new LiveException(LiveErrorCode.COMMENTS_DISABLED);
        }
        if (!isHost && accessService.isRestricted(live, author, LiveRestrictionType.MUTE)) {
            throw new LiveException(LiveErrorCode.USER_MUTED);
        }
        String content = normalize(request == null ? null : request.content());
        if (content.isEmpty()) {
            throw new LiveException(LiveErrorCode.COMMENT_EMPTY);
        }
        int maxLength = Math.min(properties.getChat().getMaxLength(), MAX_STORED_LENGTH);
        if (content.codePointCount(0, content.length()) > maxLength) {
            throw new LiveException(
                LiveErrorCode.COMMENT_TOO_LONG,
                "Comment must be at most " + maxLength + " characters"
            );
        }
        LiveProperties.RateLimit limit = properties.getChat().getRateLimit();
        long granted = store.acquire(
            "chat:" + live.getId() + ":" + author.getId(),
            1,
            limit.getMaxMessages(),
            Duration.ofSeconds(Math.max(1, limit.getWindowSeconds()))
        );
        if (granted <= 0) {
            throw new LiveException(LiveErrorCode.RATE_LIMIT_EXCEEDED);
        }

        LiveComment saved = commentRepository.save(new LiveComment(live, author, content));
        LiveCommentResponse response = mapper.toComment(saved, sanitizeClientId(request.clientId()));
        publisher.publish(live.getPublicId(), LiveEventType.COMMENT_CREATED, response);
        log.debug("live.comment.created live={} commentId={} userId={}", live.getPublicId(), saved.getId(), author.getId());
        return response;
    }

    /**
     * History in chronological order. {@code afterId} returns newer comments (polling clients);
     * otherwise the latest page, optionally older than {@code beforeId}.
     */
    public LiveCommentPageResponse list(
        Authentication authentication,
        String liveId,
        Long beforeId,
        Long afterId,
        Integer size
    ) {
        User viewer = actorResolver.optional(authentication).orElse(null);
        Live live = accessService.requireViewable(liveId, viewer);
        int defaultSize = properties.getChat().getHistoryPageSize();
        int pageSize = Math.min(Math.max(size == null ? defaultSize : size, 1), Math.max(defaultSize, 100));
        PageRequest page = PageRequest.of(0, pageSize + 1);

        List<LiveComment> rows;
        if (afterId != null) {
            rows = commentRepository.findAfter(live.getId(), afterId, page);
        } else {
            rows = new ArrayList<>(commentRepository.findRecent(live.getId(), beforeId, page));
        }
        boolean hasMore = rows.size() > pageSize;
        List<LiveComment> visible = new ArrayList<>(hasMore ? rows.subList(0, pageSize) : rows);
        if (afterId == null) {
            Collections.reverse(visible);
        }
        return new LiveCommentPageResponse(
            visible.stream().map(comment -> mapper.toComment(comment, null)).toList(),
            hasMore
        );
    }

    /** Soft delete by the author or a moderator of the LIVE. */
    public void delete(Authentication authentication, String liveId, Long commentId) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireViewable(liveId, actor);
        LiveComment comment = commentRepository.findInLive(commentId, live.getId())
            .filter(found -> found.getDeletedAt() == null)
            .orElseThrow(() -> new LiveException(LiveErrorCode.COMMENT_NOT_FOUND));
        boolean isAuthor = comment.getAuthor().getId().equals(actor.getId());
        if (!isAuthor && !accessService.canModerate(live, actor)) {
            throw new LiveException(LiveErrorCode.MODERATION_NOT_ALLOWED);
        }
        int deleted = commentRepository.softDelete(comment.getId(), actor.getId(), LocalDateTime.now());
        if (deleted == 0) {
            throw new LiveException(LiveErrorCode.COMMENT_NOT_FOUND);
        }
        publisher.publish(live.getPublicId(), LiveEventType.COMMENT_DELETED, Map.of("commentId", comment.getId()));
        log.info("live.comment.deleted live={} commentId={} actorId={} byAuthor={}", live.getPublicId(), comment.getId(), actor.getId(), isAuthor);
    }

    private static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        StringBuilder cleaned = new StringBuilder(raw.length());
        raw.codePoints()
            .filter(codePoint -> codePoint == '\n' || !Character.isISOControl(codePoint))
            .forEach(cleaned::appendCodePoint);
        return cleaned.toString().trim();
    }

    private static String sanitizeClientId(String clientId) {
        return clientId != null && CLIENT_ID.matcher(clientId).matches() ? clientId : null;
    }
}
