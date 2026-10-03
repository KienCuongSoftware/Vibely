package com.vibely.backend.live.service;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.dto.LiveCommentResponse;
import com.vibely.backend.live.dto.LiveResponse;
import com.vibely.backend.live.dto.LiveUserResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveComment;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.gift.GiftService;
import com.vibely.backend.live.realtime.LiveRealtimeStore.CounterSnapshot;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.user.entity.User;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class LiveResponseMapper {

    private static final Map<String, String> WEBRTC_PLAYBACK = Map.of("type", "webrtc");

    private final UserAvatarResolver avatarResolver;
    private final MediaUrlPresigner mediaUrlPresigner;
    private final GiftService giftService;
    private final boolean mediaEnabled;

    public LiveResponseMapper(
        UserAvatarResolver avatarResolver,
        MediaUrlPresigner mediaUrlPresigner,
        GiftService giftService,
        LiveProperties properties
    ) {
        this.avatarResolver = avatarResolver;
        this.mediaUrlPresigner = mediaUrlPresigner;
        this.giftService = giftService;
        this.mediaEnabled = properties.getMedia().isEnabled();
    }

    /**
     * @param counters realtime counters for LIVE broadcasts (null to use persisted values)
     */
    public LiveResponse toResponse(
        Live live,
        CounterSnapshot counters,
        long realtimePeak,
        boolean isOwner,
        boolean isFollowing,
        boolean canModerate
    ) {
        boolean broadcasting = live.getStatus() == LiveStatus.LIVE;
        long viewers = 0;
        if (broadcasting) {
            viewers = counters != null ? counters.viewerCount() : live.getViewerCount();
        }
        long likes = live.getLikeCount();
        if (broadcasting && counters != null && counters.likeCount() != null) {
            likes = Math.max(likes, counters.likeCount());
        }
        long peak = Math.max(live.getPeakViewerCount(), Math.max(realtimePeak, viewers));
        boolean giftsAvailable = giftService.isAvailable();
        return new LiveResponse(
            live.getPublicId(),
            live.getTitle(),
            live.getDescription(),
            live.getCategory().name(),
            presign(live.getCoverUrl()),
            live.getStatus().name(),
            live.getVisibility().name(),
            live.isAllowComments(),
            live.isAllowGifts(),
            live.isAllowGuests(),
            live.isMatureContent(),
            live.isRecordingEnabled(),
            giftsAvailable && live.isAllowGifts(),
            viewers,
            peak,
            likes,
            live.getStartedAt(),
            live.getEndedAt(),
            live.getCreatedAt(),
            toUser(live.getHost()),
            isOwner,
            isFollowing,
            canModerate,
            playbackDescriptor(live)
        );
    }

    /**
     * Tells clients which player/publisher to use. Never carries an endpoint or credential: those are
     * issued per request by {@code /playback} and {@code /publish-credential}.
     */
    private Map<String, String> playbackDescriptor(Live live) {
        if (!mediaEnabled) {
            return null;
        }
        if (live.getStatus() != LiveStatus.CREATED && live.getStatus() != LiveStatus.LIVE) {
            return null;
        }
        return WEBRTC_PLAYBACK;
    }

    public LiveUserResponse toUser(User user) {
        if (user == null) {
            return null;
        }
        String displayName = StringUtils.hasText(user.getDisplayName()) ? user.getDisplayName() : user.getUsername();
        return new LiveUserResponse(user.getId(), user.getUsername(), displayName, avatarResolver.resolve(user));
    }

    public LiveCommentResponse toComment(LiveComment comment, String clientId) {
        return new LiveCommentResponse(
            comment.getId(),
            comment.getContent(),
            toUser(comment.getAuthor()),
            comment.getCreatedAt(),
            clientId
        );
    }

    private String presign(String url) {
        if (!StringUtils.hasText(url)) {
            return null;
        }
        try {
            return mediaUrlPresigner.presignPlaybackUrl(url);
        } catch (RuntimeException ex) {
            return url;
        }
    }
}
