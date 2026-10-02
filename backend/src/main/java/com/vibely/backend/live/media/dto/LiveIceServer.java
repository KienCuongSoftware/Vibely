package com.vibely.backend.live.media.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** One RTCIceServer entry; username/credential are only present for TURN. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LiveIceServer(List<String> urls, String username, String credential) {}
