package com.vibely.backend.live.media;

import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.media.dto.LivePlaybackResponse;
import com.vibely.backend.live.media.dto.LivePublishCredentialResponse;
import com.vibely.backend.user.entity.User;
import java.util.Optional;

/**
 * Media-plane control for LIVE. The media itself flows browser to SRS to browser; implementations only
 * manage sessions, credentials and cleanup. Callers are responsible for authorizing the actor
 * (host for publish, a viewer allowed to see the LIVE for playback) before calling.
 */
public interface LiveMediaService {

    boolean isEnabled();

    /** Idempotent: prepares the media session of a LIVE that has just started. */
    void createSession(Live live);

    /** Issues a fresh single-use WHIP credential; any previously issued one stops working. */
    LivePublishCredentialResponse getPublishInfo(Live live);

    /** WHEP endpoint for a viewer (null for guests), or the current state when nothing can be played. */
    LivePlaybackResponse getPlaybackInfo(Live live, User viewer);

    /** The open (not ended) media session behind an SRS stream name. */
    Optional<LiveMediaSession> validateSession(String streamName);

    /** Whether SRS currently has the host's stream; null when media is disabled. */
    Boolean isPublishing(Live live);

    /** Revokes every credential of the LIVE: SRS hooks reject any further publish or play. */
    Optional<LiveMediaSession> revokeSession(Live live);

    /** Disconnects a viewer's playback (e.g. after a ban). Best effort; never throws. */
    void disconnectViewer(Live live, long userId);

    /**
     * Revokes the session and disconnects its SRS clients. Never throws: when SRS cannot be reached
     * the session stays flagged for cleanup and is retried later.
     */
    void endSession(Live live);
}
