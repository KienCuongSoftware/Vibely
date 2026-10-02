package com.vibely.backend.live.media;

import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.media.dto.LivePlaybackResponse;
import com.vibely.backend.live.media.dto.LivePublishCredentialResponse;
import com.vibely.backend.user.entity.User;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** Used while {@code live.media.enabled=false}: the LIVE module keeps its phase 2 behaviour. */
@Service
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "false", matchIfMissing = true)
public class DisabledLiveMediaService implements LiveMediaService {

    @Override
    public boolean isEnabled() {
        return false;
    }

    @Override
    public void createSession(Live live) {
        // No media server configured.
    }

    @Override
    public LivePublishCredentialResponse getPublishInfo(Live live) {
        throw new LiveException(LiveErrorCode.MEDIA_DISABLED);
    }

    @Override
    public LivePlaybackResponse getPlaybackInfo(Live live, User viewer) {
        throw new LiveException(LiveErrorCode.MEDIA_DISABLED);
    }

    @Override
    public Optional<LiveMediaSession> validateSession(String streamName) {
        return Optional.empty();
    }

    @Override
    public Boolean isPublishing(Live live) {
        return null;
    }

    @Override
    public Optional<LiveMediaSession> revokeSession(Live live) {
        return Optional.empty();
    }

    @Override
    public void disconnectViewer(Live live, long userId) {
        // No media server configured.
    }

    @Override
    public void endSession(Live live) {
        // No media server configured.
    }
}
