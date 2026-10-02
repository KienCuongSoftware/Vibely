package com.vibely.backend.live;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.entity.LiveMediaSessionStatus;
import com.vibely.backend.live.media.LiveMediaHealthScheduler;
import com.vibely.backend.live.media.SrsClient;
import com.vibely.backend.live.media.SrsClient.SrsClientInfo;
import com.vibely.backend.live.media.SrsClient.SrsStream;
import com.vibely.backend.live.media.SrsClient.StreamsSnapshot;
import com.vibely.backend.live.media.SrsUnavailableException;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.live.websocket.LiveStompSubscriptionInterceptor;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 3 media control plane with SRS enabled. SRS itself is replaced at the {@link SrsClient}
 * boundary; hooks go through the real endpoint and internal auth filter.
 */
@SpringBootTest(properties = {
    "app.oauth2.enabled=false",
    "spring.datasource.url=jdbc:h2:mem:vibely_live_media;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "live.media.enabled=true",
    "live.media.api-url=http://srs.test.invalid:1985",
    "live.media.hook-token=" + LiveMediaIntegrationTest.HOOK_TOKEN,
    "live.media.token-secret=test-live-media-token-secret-0123456789",
    "live.media.stun-urls=stun:stun.test.invalid:3478",
    "live.media.health-check-interval-ms=3600000",
    "live.media.reconnect-grace-seconds=1",
    "live.media.publish-start-timeout-seconds=3600"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LiveMediaIntegrationTest {

    static final String HOOK_TOKEN = "test-live-media-hook-token-0123456789";
    private static final String HOOK_PATH = "/api/internal/live/media/srs-hooks";
    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LiveMediaSessionRepository sessionRepository;

    @Autowired
    private LiveRepository liveRepository;

    @Autowired
    private LiveMediaHealthScheduler healthScheduler;

    @Autowired
    private LiveStompSubscriptionInterceptor subscriptionInterceptor;

    @MockitoBean
    private SrsClient srsClient;

    // --- descriptor / credentials -------------------------------------------------------------

    @Test
    void liveExposesWebRtcDescriptorWithoutAnyCredential() throws Exception {
        User host = register("desc");
        String liveId = startedLive(host);

        mockMvc.perform(get("/api/lives/" + liveId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.playback.type").value("webrtc"))
            .andExpect(jsonPath("$.data.playback.url").doesNotExist())
            .andExpect(jsonPath("$.data.playback.token").doesNotExist());
    }

    @Test
    void hostGetsSingleUseWhipCredentialAndIceServers() throws Exception {
        User host = register("cred");
        String liveId = startedLive(host);

        JsonNode credential = publishCredential(host, liveId);
        Endpoint whip = Endpoint.parse(credential.get("whipUrl").asText());

        assertThat(credential.get("whipUrl").asText()).startsWith("/rtc/v1/whip/?");
        assertThat(whip.app()).isEqualTo("live");
        assertThat(whip.stream()).matches("s[0-9a-f]{32}").doesNotContain(liveId.replace("-", ""));
        assertThat(whip.token()).hasSizeGreaterThanOrEqualTo(40);
        assertThat(credential.get("iceServers").get(0).get("urls").get(0).asText()).isEqualTo("stun:stun.test.invalid:3478");
        assertThat(credential.get("expiresAt").asText()).isNotBlank();

        LiveMediaSession session = sessionRepository.findByStreamName(whip.stream()).orElseThrow();
        assertThat(session.getPublishTokenHash()).isNotEqualTo(whip.token()).hasSize(64);
    }

    @Test
    void unauthorizedUsersCannotObtainPublishCredential() throws Exception {
        User host = register("owner");
        User viewer = register("intruder");
        String liveId = startedLive(host);

        mockMvc.perform(post("/api/lives/" + liveId + "/publish-credential"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/lives/" + liveId + "/publish-credential").header("Authorization", viewer.bearer()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("NOT_LIVE_HOST"));
    }

    @Test
    void invalidLiveIsRejected() throws Exception {
        User host = register("ghost");
        mockMvc.perform(post("/api/lives/0190f3a2-7c1d-7b8e-9f00-123456789abc/publish-credential")
                .header("Authorization", host.bearer()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("LIVE_NOT_FOUND"));
        mockMvc.perform(get("/api/lives/not-a-uuid/playback").header("Authorization", host.bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_LIVE_ID"));

        hook("on_publish", "pub-x", "sunknownstream", "token=whatever").andExpect(status().isForbidden());
        hook("on_play", "play-x", "sunknownstream", "token=whatever").andExpect(status().isForbidden());
    }

    // --- hooks: authentication ----------------------------------------------------------------

    @Test
    void hookEndpointRequiresTheMediaHookToken() throws Exception {
        String body = hookBody("on_publish", "c", "s", "");
        mockMvc.perform(post(HOOK_PATH).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
        mockMvc.perform(post(HOOK_PATH).param("hook_token", "wrong-token-wrong-token-wrong")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
        // Another worker's internal token must not open the media hook.
        mockMvc.perform(post(HOOK_PATH).header("X-Internal-Token", "vibely-dev-originality-token")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
        // And the media hook token must not open other internal endpoints.
        mockMvc.perform(post("/api/internal/originality/callback").header("X-Internal-Token", HOOK_TOKEN)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isNotFound());
    }

    // --- publish ------------------------------------------------------------------------------

    @Test
    void hostCanPublishOnceWithItsCredential() throws Exception {
        User host = register("pub");
        String liveId = startedLive(host);
        Endpoint whip = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());

        hook("on_publish", "pub-1", whip.stream(), whip.query())
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0));
        assertThat(session(whip).getStatus()).isEqualTo(LiveMediaSessionStatus.PUBLISHING);
        assertThat(stats(liveId).get("publishing").asBoolean()).isTrue();

        // Single use: replaying the same credential is refused.
        hook("on_publish", "pub-2", whip.stream(), whip.query()).andExpect(status().isForbidden());
        // A forged or missing token is refused.
        hook("on_publish", "pub-3", whip.stream(), "app=live&stream=" + whip.stream() + "&token=forged")
            .andExpect(status().isForbidden());
        hook("on_publish", "pub-4", whip.stream(), "app=live&stream=" + whip.stream())
            .andExpect(status().isForbidden());
    }

    @Test
    void rotatingTheCredentialRevokesThePreviousOne() throws Exception {
        User host = register("rotate");
        String liveId = startedLive(host);
        Endpoint first = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());
        Endpoint second = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());

        assertThat(second.stream()).isEqualTo(first.stream());
        assertThat(second.token()).isNotEqualTo(first.token());
        hook("on_publish", "pub-old", first.stream(), first.query()).andExpect(status().isForbidden());
        hook("on_publish", "pub-new", second.stream(), second.query()).andExpect(status().isOk());
    }

    @Test
    void endedLiveCannotPublish() throws Exception {
        User host = register("over");
        String liveId = startedLive(host);
        Endpoint whip = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());
        end(host, liveId);

        mockMvc.perform(post("/api/lives/" + liveId + "/publish-credential").header("Authorization", host.bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("LIVE_ALREADY_ENDED"));
        hook("on_publish", "pub-late", whip.stream(), whip.query()).andExpect(status().isForbidden());
    }

    // --- playback -----------------------------------------------------------------------------

    @Test
    void playbackIsOfferedOnlyWhileHostPublishes() throws Exception {
        User host = register("play");
        User viewer = register("playfan");
        String liveId = startedLive(host);

        JsonNode waiting = playback(viewer, liveId);
        assertThat(waiting.get("type").asText()).isEqualTo("webrtc");
        assertThat(waiting.get("publishing").asBoolean()).isFalse();
        assertThat(waiting.has("whepUrl")).isFalse();

        publish(host, liveId, "pub-play");
        JsonNode live = playback(viewer, liveId);
        assertThat(live.get("publishing").asBoolean()).isTrue();
        assertThat(live.get("whepUrl").asText()).startsWith("/rtc/v1/whep/?app=live&stream=");
    }

    @Test
    void guestMustSignInToWatch() throws Exception {
        User host = register("guestgate");
        String liveId = startedLive(host);
        publish(host, liveId, "pub-guestgate");

        mockMvc.perform(get("/api/lives/" + liveId + "/playback"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthorizedViewerCannotPlay() throws Exception {
        User host = register("private");
        User stranger = register("stranger");
        String liveId = createLive(host, "{\"title\":\"fans only\",\"category\":\"chat\",\"visibility\":\"FOLLOWERS\"}");
        start(host, liveId);
        publish(host, liveId, "pub-private");

        mockMvc.perform(get("/api/lives/" + liveId + "/playback").header("Authorization", stranger.bearer()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("LIVE_NOT_FOUND"));

        // A play token for another LIVE's session cannot be replayed against this stream.
        User otherHost = register("otherhost");
        String otherLive = startedLive(otherHost);
        publish(otherHost, otherLive, "pub-other");
        Endpoint otherWhep = Endpoint.parse(playback(stranger, otherLive).get("whepUrl").asText());
        String stream = session(liveId).getStreamName();
        hook("on_play", "play-steal", stream, "app=live&stream=" + stream + "&token=" + otherWhep.token())
            .andExpect(status().isForbidden());
        hook("on_play", "play-forged", stream, "app=live&stream=" + stream + "&token=abc.def")
            .andExpect(status().isForbidden());
    }

    @Test
    void bannedViewerIsRejectedAndDisconnected() throws Exception {
        User host = register("banhost");
        User troll = register("bantroll");
        String liveId = startedLive(host);
        publish(host, liveId, "pub-ban");
        Endpoint whep = Endpoint.parse(playback(troll, liveId).get("whepUrl").asText());
        hook("on_play", "play-troll", whep.stream(), whep.query()).andExpect(status().isOk());
        when(srsClient.kickClient("play-troll")).thenReturn(true);

        mockMvc.perform(post("/api/lives/" + liveId + "/restrictions/" + troll.id())
                .header("Authorization", host.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"BAN\"}"))
            .andExpect(status().isOk());

        verify(srsClient).kickClient("play-troll");
        assertThat(stats(liveId).get("viewerCount").asLong()).isZero();
        hook("on_play", "play-troll-2", whep.stream(), whep.query()).andExpect(status().isForbidden());
    }

    @Test
    void endedLiveCannotPlay() throws Exception {
        User host = register("closed");
        User viewer = register("closedfan");
        String liveId = startedLive(host);
        publish(host, liveId, "pub-closed");
        Endpoint whep = Endpoint.parse(playback(viewer, liveId).get("whepUrl").asText());
        end(host, liveId);

        JsonNode after = playback(viewer, liveId);
        assertThat(after.get("status").asText()).isEqualTo("ENDED");
        assertThat(after.get("publishing").asBoolean()).isFalse();
        assertThat(after.has("whepUrl")).isFalse();
        hook("on_play", "play-late", whep.stream(), whep.query()).andExpect(status().isForbidden());
    }

    // --- viewer counting ----------------------------------------------------------------------

    @Test
    void viewerSessionsAreIdempotentAndUnique() throws Exception {
        User host = register("count");
        User fan = register("fan");
        String liveId = startedLive(host);
        publish(host, liveId, "pub-count");

        // Opening the room (chat subscription) is not watching.
        subscribe(fan, "/topic/live/" + liveId, "ws-fan", "sub-1");
        assertThat(stats(liveId).get("viewerCount").asLong()).isZero();

        Endpoint fanWhep = Endpoint.parse(playback(fan, liveId).get("whepUrl").asText());
        hook("on_play", "play-1", fanWhep.stream(), fanWhep.query()).andExpect(status().isOk());
        hook("on_play", "play-1", fanWhep.stream(), fanWhep.query()).andExpect(status().isOk());
        assertThat(stats(liveId).get("viewerCount").asLong()).isEqualTo(1);

        // Second tab of the same user counts once.
        Endpoint fanTab2 = Endpoint.parse(playback(fan, liveId).get("whepUrl").asText());
        hook("on_play", "play-2", fanTab2.stream(), fanTab2.query()).andExpect(status().isOk());
        assertThat(stats(liveId).get("viewerCount").asLong()).isEqualTo(1);

        // Another account is a distinct viewer; the host watching is not counted.
        Endpoint other = Endpoint.parse(playback(register("fan2"), liveId).get("whepUrl").asText());
        hook("on_play", "play-guest", other.stream(), other.query()).andExpect(status().isOk());
        Endpoint hostWhep = Endpoint.parse(playback(host, liveId).get("whepUrl").asText());
        hook("on_play", "play-host", hostWhep.stream(), hostWhep.query()).andExpect(status().isOk());
        assertThat(stats(liveId).get("viewerCount").asLong()).isEqualTo(2);

        hook("on_stop", "play-1", fanWhep.stream(), "").andExpect(status().isOk());
        hook("on_stop", "play-1", fanWhep.stream(), "").andExpect(status().isOk());
        assertThat(stats(liveId).get("viewerCount").asLong()).isEqualTo(2);
        hook("on_stop", "play-2", fanWhep.stream(), "").andExpect(status().isOk());
        hook("on_stop", "play-guest", fanWhep.stream(), "").andExpect(status().isOk());
        hook("on_stop", "play-unknown", fanWhep.stream(), "").andExpect(status().isOk());
        assertThat(stats(liveId).get("viewerCount").asLong()).isZero();
    }

    // --- end / cleanup / disconnect -----------------------------------------------------------

    @Test
    void hostEndsLiveAndSrsClientsAreDisconnected() throws Exception {
        User host = register("ender");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-end");
        when(srsClient.listClients()).thenReturn(List.of(
            new SrsClientInfo("pub-end", whip.stream(), true),
            new SrsClientInfo("play-a", whip.stream(), false),
            new SrsClientInfo("play-other", "sotherstream", false)
        ));
        when(srsClient.kickClient(anyString())).thenReturn(true);

        end(host, liveId);

        verify(srsClient).kickClient("pub-end");
        verify(srsClient).kickClient("play-a");
        verify(srsClient, never()).kickClient("play-other");
        LiveMediaSession session = session(whip);
        assertThat(session.getStatus()).isEqualTo(LiveMediaSessionStatus.ENDED);
        assertThat(session.isCleanupPending()).isFalse();
        assertThat(session.getPublishTokenHash()).isNull();
    }

    @Test
    void srsCleanupFailureDoesNotUndoEndAndIsRetried() throws Exception {
        User host = register("retry");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-retry");
        when(srsClient.listClients()).thenThrow(new SrsUnavailableException("down"));

        end(host, liveId);

        mockMvc.perform(get("/api/lives/" + liveId)).andExpect(jsonPath("$.data.status").value("ENDED"));
        assertThat(session(whip).isCleanupPending()).isTrue();

        org.mockito.Mockito.reset(srsClient);
        when(srsClient.listStreams()).thenReturn(new StreamsSnapshot("srv-1", Map.of()));
        when(srsClient.listClients()).thenReturn(List.of(new SrsClientInfo("pub-retry", whip.stream(), true)));
        when(srsClient.kickClient("pub-retry")).thenReturn(true);
        healthScheduler.check();

        verify(srsClient).kickClient("pub-retry");
        assertThat(session(whip).isCleanupPending()).isFalse();
    }

    @Test
    void hostDisconnectEndsLiveOnlyAfterGracePeriod() throws Exception {
        User host = register("drop");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-drop");

        // A stale notification from a client that does not own the stream is ignored.
        hook("on_unpublish", "pub-someone-else", whip.stream(), "").andExpect(status().isOk());
        assertThat(session(whip).getStatus()).isEqualTo(LiveMediaSessionStatus.PUBLISHING);

        hook("on_unpublish", "pub-drop", whip.stream(), "").andExpect(status().isOk());
        assertThat(session(whip).getStatus()).isEqualTo(LiveMediaSessionStatus.INTERRUPTED);
        when(srsClient.listStreams()).thenReturn(new StreamsSnapshot("srv-1", Map.of()));
        when(srsClient.listClients()).thenReturn(List.of());

        // Within the grace period the LIVE stays up and the host may reconnect.
        healthScheduler.check();
        mockMvc.perform(get("/api/lives/" + liveId)).andExpect(jsonPath("$.data.status").value("LIVE"));

        Thread.sleep(1_300);
        healthScheduler.check();
        mockMvc.perform(get("/api/lives/" + liveId)).andExpect(jsonPath("$.data.status").value("ENDED"));
        assertThat(session(whip).getStatus()).isEqualTo(LiveMediaSessionStatus.ENDED);
    }

    @Test
    void hostReconnectWithinGraceKeepsLiveRunning() throws Exception {
        User host = register("back");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-first");
        hook("on_unpublish", "pub-first", whip.stream(), "").andExpect(status().isOk());

        Endpoint again = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());
        hook("on_publish", "pub-second", again.stream(), again.query()).andExpect(status().isOk());
        assertThat(session(whip).getStatus()).isEqualTo(LiveMediaSessionStatus.PUBLISHING);
        assertThat(session(whip).getPublishCount()).isEqualTo(2);

        when(srsClient.listStreams()).thenReturn(new StreamsSnapshot("srv-1", Map.of(
            whip.stream(), new SrsStream(whip.stream(), true, "pub-second")
        )));
        Thread.sleep(1_300);
        healthScheduler.check();
        mockMvc.perform(get("/api/lives/" + liveId)).andExpect(jsonPath("$.data.status").value("LIVE"));
    }

    @Test
    void publishingSessionMissingFromSrsBecomesInterrupted() throws Exception {
        User host = register("vanish");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-vanish");
        Thread.sleep(3_200);
        when(srsClient.listStreams()).thenReturn(new StreamsSnapshot("srv-1", Map.of()));

        healthScheduler.check();

        assertThat(session(whip).getStatus()).isEqualTo(LiveMediaSessionStatus.INTERRUPTED);
        mockMvc.perform(get("/api/lives/" + liveId)).andExpect(jsonPath("$.data.status").value("LIVE"));
    }

    // --- helpers ------------------------------------------------------------------------------

    private record User(long id, String email, String token) {
        String bearer() {
            return "Bearer " + token;
        }
    }

    private record Endpoint(String app, String stream, String token, String query) {
        static Endpoint parse(String url) {
            MultiValueMap<String, String> params = UriComponentsBuilder.fromUriString(url).build().getQueryParams();
            return new Endpoint(
                params.getFirst("app"),
                params.getFirst("stream"),
                params.getFirst("token"),
                url.substring(url.indexOf('?') + 1)
            );
        }
    }

    private Endpoint publish(User host, String liveId, String clientId) throws Exception {
        Endpoint whip = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());
        hook("on_publish", clientId, whip.stream(), whip.query()).andExpect(status().isOk());
        return whip;
    }

    private JsonNode publishCredential(User host, String liveId) throws Exception {
        return data(mockMvc.perform(post("/api/lives/" + liveId + "/publish-credential").header("Authorization", host.bearer())));
    }

    private JsonNode playback(User viewer, String liveId) throws Exception {
        var request = get("/api/lives/" + liveId + "/playback");
        if (viewer != null) {
            request.header("Authorization", viewer.bearer());
        }
        return data(mockMvc.perform(request));
    }

    private JsonNode stats(String liveId) throws Exception {
        return data(mockMvc.perform(get("/api/lives/" + liveId + "/stats")));
    }

    private LiveMediaSession session(Endpoint endpoint) {
        return sessionRepository.findByStreamName(endpoint.stream()).orElseThrow();
    }

    private LiveMediaSession session(String liveId) {
        long id = liveRepository.findWithHostByPublicId(UUID.fromString(liveId)).orElseThrow().getId();
        return sessionRepository.findByLiveId(id).orElseThrow();
    }

    private ResultActions hook(String action, String clientId, String stream, String param) throws Exception {
        return mockMvc.perform(post(HOOK_PATH)
            .param("hook_token", HOOK_TOKEN)
            .contentType(MediaType.APPLICATION_JSON)
            .content(hookBody(action, clientId, stream, param)));
    }

    private String hookBody(String action, String clientId, String stream, String param) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("server_id", "vid-test");
        body.put("action", action);
        body.put("client_id", clientId);
        body.put("ip", "127.0.0.1");
        body.put("vhost", "__defaultVhost__");
        body.put("app", "live");
        body.put("stream", stream);
        body.put("param", param);
        return objectMapper.writeValueAsString(body);
    }

    private User register(String prefix) throws Exception {
        int sequence = SEQUENCE.incrementAndGet();
        String username = ("lm_" + prefix + "_" + sequence + "_" + Long.toString(System.nanoTime() % 100000, 36));
        String email = username + "@vibely.dev";
        String payload = """
            {"username":"%s","email":"%s","password":"secret123","birthDate":"2000-01-15"}
            """.formatted(username, email);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .with(request -> {
                    request.setRemoteAddr("10.43." + (sequence / 250) + "." + (sequence % 250 + 1));
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        return new User(data.get("userId").asLong(), email, data.get("accessToken").asText());
    }

    private String createLive(User host, String body) throws Exception {
        return data(mockMvc.perform(post("/api/lives").header("Authorization", host.bearer())
            .contentType(MediaType.APPLICATION_JSON).content(body))).get("id").asText();
    }

    private String startedLive(User host) throws Exception {
        String liveId = createLive(host, "{\"title\":\"media test\",\"category\":\"music\"}");
        start(host, liveId);
        return liveId;
    }

    private void start(User host, String liveId) throws Exception {
        mockMvc.perform(post("/api/lives/" + liveId + "/start").header("Authorization", host.bearer()))
            .andExpect(status().isOk());
    }

    private void end(User host, String liveId) throws Exception {
        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ENDED"));
    }

    private void subscribe(User user, String destination, String sessionId, String subscriptionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        accessor.setSessionId(sessionId);
        accessor.setSubscriptionId(subscriptionId);
        accessor.setUser(new UsernamePasswordAuthenticationToken(user.email(), null, List.of()));
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        subscriptionInterceptor.preSend(message, mock(MessageChannel.class));
    }

    private JsonNode data(ResultActions actions) throws Exception {
        MvcResult result = actions.andReturn();
        int status = result.getResponse().getStatus();
        assertThat(status).as(result.getResponse().getContentAsString()).isBetween(200, 299);
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }
}
