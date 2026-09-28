package com.vibely.backend.live.dto;

/** {@code accepted} is how many of the requested likes counted after spam limiting. */
public record LiveLikeResponse(long likeCount, long accepted) {}
