package com.vibely.backend.live.dto;

import jakarta.validation.constraints.Size;

/**
 * {@code clientId} is an optional client-generated id echoed back in COMMENT_CREATED so the sender
 * can reconcile its optimistic message. Length limits on content are enforced by the service.
 */
public record LiveCommentRequest(
    @Size(max = 2000, message = "Comment is too long")
    String content,
    @Size(max = 64, message = "clientId is too long")
    String clientId
) {}
