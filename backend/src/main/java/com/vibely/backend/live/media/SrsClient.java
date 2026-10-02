package com.vibely.backend.live.media;

import java.util.List;
import java.util.Map;

/**
 * Server-side calls to the SRS HTTP API (v6). Only operations that genuinely need SRS are here:
 * publish/play authorization happens through SRS HTTP hooks, not through API calls.
 *
 * <p>Implementations throw {@link SrsUnavailableException} when SRS cannot be reached or answers
 * with an error, so callers can keep business state correct and retry later.
 */
public interface SrsClient {

    /** {@code GET /api/v1/streams}: stream name (within the configured app) to publish state. */
    StreamsSnapshot listStreams();

    /** {@code GET /api/v1/clients}: every connected publisher/player. */
    List<SrsClientInfo> listClients();

    /**
     * {@code DELETE /api/v1/clients/{id}}: disconnects a publisher or player.
     * Returns false when SRS no longer knows the client (already gone).
     */
    boolean kickClient(String clientId);

    /** @param serverId changes whenever SRS restarts */
    record StreamsSnapshot(String serverId, Map<String, SrsStream> streams) {}

    /** @param publisherClientId SRS client id of the active publisher, null when none */
    record SrsStream(String name, boolean active, String publisherClientId) {}

    record SrsClientInfo(String id, String streamName, boolean publisher) {}
}
