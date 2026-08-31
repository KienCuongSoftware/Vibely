package com.vibely.backend.moderation;

import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPrivacy;
import com.vibely.backend.video.VideoStatus;
import org.springframework.stereotype.Service;

/**
 * TikTok-style publication privacy: on publish the creator's chosen privacy is stored in
 * {@code intended_privacy} while {@code privacy} stays {@link VideoPrivacy#PRIVATE} until
 * encoding and moderation review finish.
 */
@Service
public class ModerationPrivacyHoldService {

    /**
     * Call when a draft becomes a published post (create or Studio publish).
     */
    public void applyHoldOnPublish(Video video) {
        if (video == null || video.isStudioDraft()) {
            return;
        }
        if (video.getIntendedPrivacy() == null) {
            video.setIntendedPrivacy(video.getPrivacy());
        }
        video.setPrivacy(VideoPrivacy.PRIVATE);
    }

    public boolean isPrivacyLocked(Video video, boolean reviewRequired) {
        if (video == null || video.isStudioDraft()) {
            return false;
        }
        if (video.getStatus() == VideoStatus.REMOVED) {
            return false;
        }
        VideoStatus status = video.getStatus();
        if (status == VideoStatus.RAW
            || status == VideoStatus.PROCESSING
            || status == VideoStatus.HIDDEN) {
            return true;
        }
        if (reviewRequired) {
            return true;
        }
        return hasPendingIntendedPrivacy(video);
    }

    /**
     * Restore creator privacy after review / encoding completes.
     */
    public void releaseIfEligible(Video video, boolean reviewRequired) {
        if (video == null || !shouldRelease(video, reviewRequired)) {
            return;
        }
        VideoPrivacy intended = video.getIntendedPrivacy();
        if (intended != null) {
            video.setPrivacy(intended);
        }
        video.setIntendedPrivacy(null);
    }

    public void assertPrivacyChangeAllowed(Video video, boolean reviewRequired) {
        if (isPrivacyLocked(video, reviewRequired)) {
            throw new com.vibely.backend.common.BadRequestException(
                "Privacy cannot be changed while content is under review."
            );
        }
    }

    private boolean shouldRelease(Video video, boolean reviewRequired) {
        if (video.isStudioDraft() || reviewRequired) {
            return false;
        }
        VideoStatus status = video.getStatus();
        if (status == VideoStatus.RAW
            || status == VideoStatus.PROCESSING
            || status == VideoStatus.HIDDEN
            || status == VideoStatus.REMOVED) {
            return false;
        }
        return video.getIntendedPrivacy() != null;
    }

    private boolean hasPendingIntendedPrivacy(Video video) {
        VideoPrivacy intended = video.getIntendedPrivacy();
        return intended != null && intended != video.getPrivacy();
    }
}
