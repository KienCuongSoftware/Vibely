package com.vibely.backend.live.media.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Body of an SRS v6 HTTP hook (on_publish, on_unpublish, on_play, on_stop). For WebRTC
 * {@code param} is the full WHIP/WHEP query string, which carries the Vibely token.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SrsHookRequest(
    String action,
    @JsonProperty("client_id") String clientId,
    String ip,
    String vhost,
    String app,
    String stream,
    String param,
    @JsonProperty("server_id") String serverId
) {}
