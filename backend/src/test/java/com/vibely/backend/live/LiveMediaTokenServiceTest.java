package com.vibely.backend.live;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.media.LiveMediaTokenService;
import com.vibely.backend.live.media.LiveMediaTokenService.PlaybackClaims;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LiveMediaTokenServiceTest {

    private final LiveMediaTokenService tokens = new LiveMediaTokenService(properties("unit-test-secret-unit-test-secret"));

    @Test
    void playbackTokenRoundTripsUntilExpiry() {
        Instant now = Instant.now();
        String token = tokens.issuePlaybackToken(7L, "u42", now.plusSeconds(60));

        PlaybackClaims claims = tokens.verifyPlaybackToken(token, now).orElseThrow();
        assertThat(claims.sessionId()).isEqualTo(7L);
        assertThat(claims.viewerKey()).isEqualTo("u42");
        assertThat(tokens.verifyPlaybackToken(token, now.plusSeconds(61))).isEmpty();
    }

    @Test
    void tamperedOrForeignPlaybackTokensAreRejected() {
        Instant now = Instant.now();
        String token = tokens.issuePlaybackToken(7L, "u42", now.plusSeconds(60));
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
            .encodeToString(("8.u42." + now.plusSeconds(60).getEpochSecond()).getBytes());

        assertThat(tokens.verifyPlaybackToken(forgedPayload + token.substring(token.indexOf('.')), now)).isEmpty();
        assertThat(tokens.verifyPlaybackToken("garbage", now)).isEmpty();
        assertThat(tokens.verifyPlaybackToken(null, now)).isEmpty();

        LiveMediaTokenService otherKey = new LiveMediaTokenService(properties("another-secret-another-secret-xx"));
        assertThat(otherKey.verifyPlaybackToken(token, now)).isEmpty();
    }

    @Test
    void publishTokensAndStreamNamesAreRandomAndHashed() {
        Set<String> seen = new HashSet<>();
        for (int index = 0; index < 50; index++) {
            assertThat(seen.add(tokens.newPublishToken())).isTrue();
            assertThat(seen.add(tokens.newStreamName())).isTrue();
        }
        String token = tokens.newPublishToken();
        assertThat(tokens.hashPublishToken(token)).hasSize(64).isEqualTo(tokens.hashPublishToken(token)).isNotEqualTo(token);
    }

    private static LiveProperties properties(String secret) {
        LiveProperties properties = new LiveProperties();
        properties.getMedia().setTokenSecret(secret);
        return properties;
    }
}
