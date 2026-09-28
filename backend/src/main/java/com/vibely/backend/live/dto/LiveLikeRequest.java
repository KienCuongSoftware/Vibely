package com.vibely.backend.live.dto;

/** Batched taps from the client; null means a single like. */
public record LiveLikeRequest(Integer count) {}
