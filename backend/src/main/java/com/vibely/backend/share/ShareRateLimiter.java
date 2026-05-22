package com.vibely.backend.share;

/**
 * Distributed / in-process rate limiting for share redirect and share write endpoints.
 */
public interface ShareRateLimiter {

    /**
     * @return true if request is allowed within the configured window
     */
    boolean allowRedirect(String clientIp);

    boolean allowShareWrite(String subjectKey);
}
