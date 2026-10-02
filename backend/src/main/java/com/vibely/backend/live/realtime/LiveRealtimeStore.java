package com.vibely.backend.live.realtime;

import java.time.Duration;
import java.util.Collection;
import java.util.Map;
import java.util.Set;

/**
 * Realtime LIVE state (presence, hot counters, rate-limit buckets). Redis-backed when
 * {@code app.redis.enabled=true}; an in-memory implementation is used otherwise (single node, tests).
 * Every mutation is atomic, and viewer counts are derived from unique viewers so they cannot go negative.
 */
public interface LiveRealtimeStore {

    /** Marks the LIVE as accepting viewers and tracks it for periodic persistence. */
    void activate(long liveId);

    /** Stops accepting viewers; existing counters stay readable until {@link #clear(long)}. */
    void deactivate(long liveId);

    boolean isActive(long liveId);

    /** Refreshes TTLs of the LIVE keys so long broadcasts do not expire. */
    void touch(long liveId);

    /**
     * Adds one connection for the viewer. Rejected (accepted=false) when the LIVE is not active.
     * {@code viewerKey} identifies a unique viewer ({@link #userKey(long)} for signed-in users, an
     * opaque per-playback key for guests).
     */
    ViewerChange join(long liveId, String viewerKey);

    /** Removes one connection for the viewer; a viewer without connections is a no-op. */
    ViewerChange leave(long liveId, String viewerKey);

    static String userKey(long userId) {
        return "u" + userId;
    }

    long viewerCount(long liveId);

    long peakViewerCount(long liveId);

    /** Adds likes to the hot counter (seeded from the persisted value on first use) and to the per-user pending tally. */
    long addLikes(long liveId, long userId, long count, long persistedLikeCount);

    long likeCount(long liveId, long persistedLikeCount);

    /** Viewer and like counters for several LIVEs in one round trip; likes are null when not cached. */
    Map<Long, CounterSnapshot> snapshot(Collection<Long> liveIds);

    /** Atomically takes and resets the per-user like tallies that have not been persisted yet. */
    Map<Long, Long> drainPendingLikes(long liveId);

    Set<Long> activeLiveIds();

    /**
     * Fixed-window quota: consumes up to {@code requested} units from the bucket and returns how
     * many were granted (0 when the window is exhausted).
     */
    long acquire(String bucket, long requested, long limit, Duration window);

    /** Deletes every realtime key of the LIVE. */
    void clear(long liveId);

    record ViewerChange(boolean accepted, long viewerCount, boolean countChanged) {

        public static ViewerChange rejected() {
            return new ViewerChange(false, 0, false);
        }
    }

    record CounterSnapshot(long viewerCount, Long likeCount) {}
}
