package com.vibely.backend.live.service;

import com.vibely.backend.live.dto.LiveModeratorResponse;
import com.vibely.backend.live.dto.LiveReportRequest;
import com.vibely.backend.live.dto.LiveRestrictionRequest;
import com.vibely.backend.live.dto.LiveRestrictionResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveModerator;
import com.vibely.backend.live.entity.LiveReport;
import com.vibely.backend.live.entity.LiveRestrictionType;
import com.vibely.backend.live.entity.LiveUserRestriction;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.realtime.LiveEventType;
import com.vibely.backend.live.repository.LiveCommentRepository;
import com.vibely.backend.live.repository.LiveModeratorRepository;
import com.vibely.backend.live.repository.LiveReportRepository;
import com.vibely.backend.live.repository.LiveUserRestrictionRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Moderation foundation: per-LIVE mute/ban, host-appointed moderators and user reports.
 * Comment deletion lives in {@link LiveCommentService}.
 */
@Service
public class LiveModerationService {

    private static final Logger log = LoggerFactory.getLogger(LiveModerationService.class);

    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final LiveUserRestrictionRepository restrictionRepository;
    private final LiveModeratorRepository moderatorRepository;
    private final LiveReportRepository reportRepository;
    private final LiveCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final LiveEventPublisher publisher;
    private final LiveResponseMapper mapper;

    public LiveModerationService(
        LiveActorResolver actorResolver,
        LiveAccessService accessService,
        LiveUserRestrictionRepository restrictionRepository,
        LiveModeratorRepository moderatorRepository,
        LiveReportRepository reportRepository,
        LiveCommentRepository commentRepository,
        UserRepository userRepository,
        LiveEventPublisher publisher,
        LiveResponseMapper mapper
    ) {
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.restrictionRepository = restrictionRepository;
        this.moderatorRepository = moderatorRepository;
        this.reportRepository = reportRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.publisher = publisher;
        this.mapper = mapper;
    }

    public LiveRestrictionResponse restrict(
        Authentication authentication,
        String liveId,
        Long targetUserId,
        LiveRestrictionRequest request
    ) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        requireModerator(live, actor);
        User target = requireRestrictableTarget(live, actor, targetUserId);
        LiveRestrictionType type = parseType(request.type());
        LocalDateTime expiresAt = request.durationMinutes() == null
            ? null
            : LocalDateTime.now().plusMinutes(request.durationMinutes());
        String reason = StringUtils.hasText(request.reason()) ? request.reason().trim() : null;

        LiveUserRestriction restriction = upsertRestriction(live, target, type, reason, expiresAt, actor);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", target.getId());
        payload.put("type", type.name());
        payload.put("expiresAt", expiresAt);
        publisher.publish(live.getPublicId(), LiveEventType.USER_RESTRICTED, payload);
        log.info("live.restriction.applied live={} type={} targetId={} actorId={}", live.getPublicId(), type, target.getId(), actor.getId());
        return new LiveRestrictionResponse(target.getId(), type.name(), restriction.getExpiresAt());
    }

    public void unrestrict(Authentication authentication, String liveId, Long targetUserId, String rawType) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        requireModerator(live, actor);
        LiveRestrictionType type = parseType(rawType);
        restrictionRepository.deleteRestriction(live.getId(), targetUserId, type);
        log.info("live.restriction.removed live={} type={} targetId={} actorId={}", live.getPublicId(), type, targetUserId, actor.getId());
    }

    public List<LiveModeratorResponse> listModerators(Authentication authentication) {
        User host = actorResolver.require(authentication);
        return moderatorRepository.findByHostIdWithModerator(host.getId()).stream()
            .map(moderator -> new LiveModeratorResponse(mapper.toUser(moderator.getModerator()), moderator.getCreatedAt()))
            .toList();
    }

    /** Appoints a moderator for every LIVE of the current user; idempotent. */
    public LiveModeratorResponse addModerator(Authentication authentication, Long moderatorId) {
        User host = actorResolver.require(authentication);
        if (moderatorId == null || moderatorId.equals(host.getId())) {
            throw new LiveException(LiveErrorCode.INVALID_MODERATOR);
        }
        User moderator = userRepository.findById(moderatorId)
            .orElseThrow(() -> new LiveException(LiveErrorCode.INVALID_MODERATOR));
        if (!moderatorRepository.existsByHostIdAndModerator_Id(host.getId(), moderatorId)) {
            try {
                moderatorRepository.save(new LiveModerator(host.getId(), moderator));
                log.info("live.moderator.added hostId={} moderatorId={}", host.getId(), moderatorId);
            } catch (DataIntegrityViolationException raced) {
                // Added concurrently: already a moderator.
            }
        }
        return new LiveModeratorResponse(mapper.toUser(moderator), LocalDateTime.now());
    }

    public void removeModerator(Authentication authentication, Long moderatorId) {
        User host = actorResolver.require(authentication);
        if (moderatorRepository.deletePair(host.getId(), moderatorId) > 0) {
            log.info("live.moderator.removed hostId={} moderatorId={}", host.getId(), moderatorId);
        }
    }

    public void report(Authentication authentication, String liveId, LiveReportRequest request) {
        User reporter = actorResolver.require(authentication);
        Live live = accessService.requireViewable(liveId, reporter);
        Long commentId = request.commentId();
        if (commentId != null && commentRepository.findInLive(commentId, live.getId()).isEmpty()) {
            throw new LiveException(LiveErrorCode.COMMENT_NOT_FOUND);
        }
        if (reportRepository.existsOpenReport(reporter.getId(), live.getId(), commentId)) {
            throw new LiveException(LiveErrorCode.ALREADY_REPORTED);
        }
        String details = StringUtils.hasText(request.details()) ? request.details().trim() : null;
        reportRepository.save(new LiveReport(live.getId(), commentId, reporter.getId(), request.reason().trim(), details));
        log.info("live.report.created live={} reporterId={} onComment={}", live.getPublicId(), reporter.getId(), commentId != null);
    }

    private void requireModerator(Live live, User actor) {
        if (!accessService.canModerate(live, actor)) {
            if (!accessService.canSee(live, actor)) {
                throw new LiveException(LiveErrorCode.LIVE_NOT_FOUND);
            }
            throw new LiveException(LiveErrorCode.MODERATION_NOT_ALLOWED);
        }
    }

    /** Nobody can restrict the host or themselves; only the host or an admin can restrict a moderator. */
    private User requireRestrictableTarget(Live live, User actor, Long targetUserId) {
        if (targetUserId == null || targetUserId.equals(actor.getId()) || targetUserId.equals(live.getHost().getId())) {
            throw new LiveException(LiveErrorCode.INVALID_RESTRICTION_TARGET);
        }
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new LiveException(LiveErrorCode.INVALID_RESTRICTION_TARGET));
        boolean privileged = live.isHostedBy(actor) || LiveAccessService.isAdmin(actor);
        if (!privileged && (LiveAccessService.isAdmin(target) || accessService.isLiveModerator(live, target.getId()))) {
            throw new LiveException(LiveErrorCode.MODERATION_NOT_ALLOWED);
        }
        return target;
    }

    private LiveUserRestriction upsertRestriction(
        Live live,
        User target,
        LiveRestrictionType type,
        String reason,
        LocalDateTime expiresAt,
        User actor
    ) {
        for (int attempt = 0; attempt < 2; attempt++) {
            LiveUserRestriction restriction = restrictionRepository
                .findByLiveIdAndUserIdAndType(live.getId(), target.getId(), type)
                .orElseGet(() -> new LiveUserRestriction(live.getId(), target.getId(), type));
            restriction.renew(reason, expiresAt, actor.getId());
            try {
                return restrictionRepository.save(restriction);
            } catch (DataIntegrityViolationException raced) {
                // Created concurrently; retry as an update.
            }
        }
        throw new LiveException(LiveErrorCode.CONCURRENT_UPDATE);
    }

    private static LiveRestrictionType parseType(String raw) {
        if (raw == null) {
            throw new LiveException(LiveErrorCode.INVALID_RESTRICTION_TARGET, "Restriction type must be MUTE or BAN");
        }
        try {
            return LiveRestrictionType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new LiveException(LiveErrorCode.INVALID_RESTRICTION_TARGET, "Restriction type must be MUTE or BAN");
        }
    }
}
