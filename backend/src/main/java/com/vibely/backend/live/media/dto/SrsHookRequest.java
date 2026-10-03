package com.vibely.backend.live.media.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Body of an SRS v6 HTTP hook (on_publish, on_unpublish, on_play, on_stop, on_dvr). For WebRTC
 * {@code param} is the full WHIP/WHEP query string, which carries the Vibely token. {@code cwd} and
 * {@code file} are only sent by on_dvr ({@code file} may be relative to {@code cwd}).
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
    @JsonProperty("server_id") String serverId,
    String cwd,
    String file
) {}
