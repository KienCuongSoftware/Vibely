package com.vibely.backend.live.service;

import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveRestrictionType;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.repository.LiveModeratorRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.live.repository.LiveUserRestrictionRepository;
import com.vibely.backend.user.entity.Role;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Server-side authorization for LIVE. Invisible LIVEs are reported as LIVE_NOT_FOUND so their
 * existence does not leak.
 */
@Service
public class LiveAccessService {

    private final LiveRepository liveRepository;
    private final LiveModeratorRepository moderatorRepository;
    private final LiveUserRestrictionRepository restrictionRepository;
    private final FollowRepository followRepository;

    public LiveAccessService(
        LiveRepository liveRepository,
        LiveModeratorRepository moderatorRepository,
        LiveUserRestrictionRepository restrictionRepository,
        FollowRepository followRepository
    ) {
        this.liveRepository = liveRepository;
        this.moderatorRepository = moderatorRepository;
        this.restrictionRepository = restrictionRepository;
        this.followRepository = followRepository;
    }

    public static UUID parseId(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            throw new LiveException(LiveErrorCode.INVALID_LIVE_ID);
        }
        try {
            return UUID.fromString(rawId.trim());
        } catch (IllegalArgumentException ex) {
            throw new LiveException(LiveErrorCode.INVALID_LIVE_ID);
        }
    }

    /** Loads the LIVE (with host) without any visibility check. */
    public Live requireExisting(String rawId) {
        return liveRepository.findWithHostByPublicId(parseId(rawId))
            .orElseThrow(() -> new LiveException(LiveErrorCode.LIVE_NOT_FOUND));
    }

    /** Loads a LIVE the viewer may see; banned viewers get USER_BANNED. */
    public Live requireViewable(String rawId, User viewer) {
        Live live = requireExisting(rawId);
        requireViewable(live, viewer);
        return live;
    }

    public void requireViewable(Live live, User viewer) {
        if (!canSee(live, viewer)) {
            throw new LiveException(LiveErrorCode.LIVE_NOT_FOUND);
        }
        if (viewer != null && !canModerate(live, viewer) && isRestricted(live, viewer, LiveRestrictionType.BAN)) {
            throw new LiveException(LiveErrorCode.USER_BANNED);
        }
    }

    /** Visibility only (no ban check). */
    public boolean canSee(Live live, User viewer) {
        if (live.isHostedBy(viewer) || isAdmin(viewer)) {
            return true;
        }
        if (live.getStatus() == LiveStatus.CREATED || live.getStatus() == LiveStatus.CANCELLED) {
            return false;
        }
        if (live.getHost().getAccountStatus() != UserAccountStatus.ACTIVE) {
            return false;
        }
        return switch (live.getVisibility()) {
            case PUBLIC -> true;
            case FOLLOWERS -> viewer != null && follows(viewer, live.getHost());
            case FRIENDS -> viewer != null && follows(viewer, live.getHost()) && follows(live.getHost(), viewer);
        };
    }

    public void requireHost(Live live, User actor) {
        if (!live.isHostedBy(actor)) {
            throw new LiveException(LiveErrorCode.NOT_LIVE_HOST);
        }
    }

    /** Host, a moderator appointed by the host, or a platform admin. */
    public boolean canModerate(Live live, User actor) {
        if (actor == null) {
            return false;
        }
        if (live.isHostedBy(actor) || isAdmin(actor)) {
            return true;
        }
        return moderatorRepository.existsByHostIdAndModerator_Id(live.getHost().getId(), actor.getId());
    }

    public boolean isLiveModerator(Live live, Long userId) {
        return moderatorRepository.existsByHostIdAndModerator_Id(live.getHost().getId(), userId);
    }

    public boolean isRestricted(Live live, User user, LiveRestrictionType type) {
        return restrictionRepository.existsActive(live.getId(), user.getId(), EnumSet.of(type), LocalDateTime.now());
    }

    public boolean isFollowing(User viewer, User host) {
        if (viewer == null || host == null || viewer.getId().equals(host.getId())) {
            return false;
        }
        return follows(viewer, host);
    }

    public static boolean isAdmin(User user) {
        return user != null && user.getRole() == Role.ADMIN;
    }

    private boolean follows(User follower, User following) {
        return followRepository.existsAcceptedByFollowerAndFollowing(follower, following);
    }
}
