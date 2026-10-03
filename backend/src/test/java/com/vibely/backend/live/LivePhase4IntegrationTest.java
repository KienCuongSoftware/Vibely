package com.vibely.backend.live;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveRecording;
import com.vibely.backend.live.repository.LiveRecordingRepository;
import com.vibely.backend.live.repository.LiveRecordingSegmentRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.live.media.SrsClient;
import com.vibely.backend.live.service.LiveLimitsScheduler;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 4 control plane: HLS fallback authorization, interrupted state, DVR hook handling, analytics,
 * capabilities and the max-duration limit. S3 is disabled in tests, so recording is unavailable and
 * never blocks the LIVE lifecycle.
 */
@SpringBootTest(properties = {
    "app.oauth2.enabled=false",
    "spring.datasource.url=jdbc:h2:mem:vibely_live_phase4;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "live.media.enabled=true",
    "live.media.api-url=http://srs.test.invalid:1985",
    "live.media.hook-token=" + LivePhase4IntegrationTest.HOOK_TOKEN,
    "live.media.token-secret=test-live-phase4-token-secret-0123456789",
    "live.media.health-check-interval-ms=3600000",
    "live.media.publish-start-timeout-seconds=3600",
    "live.hls.enabled=true",
    "live.recording.enabled=true",
    "live.recording.worker-interval-ms=3600000",
    "live.limits.check-interval-ms=3600000",
    "live.limits.max-duration-minutes=240"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LivePhase4IntegrationTest {

    static final String HOOK_TOKEN = "test-live-phase4-hook-token-0123456789";
    private static final String HOOK_PATH = "/api/internal/live/media/srs-hooks";
    private static final String HLS_AUTH = "/api/live-media/hls-auth";
    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final Path DVR_DIR = createTempDir();

    @DynamicPropertySource
    static void dvrDir(DynamicPropertyRegistry registry) {
        registry.add("live.recording.dvr-dir", DVR_DIR::toString);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LiveRepository liveRepository;

    @Autowired
    private LiveRecordingRepository recordingRepository;

    @Autowired
    private LiveRecordingSegmentRepository segmentRepository;

    @Autowired
    private LiveLimitsScheduler limitsScheduler;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private SrsClient srsClient;

    // --- capabilities / recording toggle ------------------------------------------------------

    @Test
    void capabilitiesReflectConfigurationAndRecordingNeedsStorage() throws Exception {
        mockMvc.perform(get("/api/lives/capabilities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.media").value(true))
            .andExpect(jsonPath("$.data.hlsFallback").value(true))
            .andExpect(jsonPath("$.data.recording").value(false))
            .andExpect(jsonPath("$.data.maxDurationMinutes").value(240));

        User host = register("toggle");
        String liveId = createLive(host, "{\"title\":\"rec\",\"category\":\"music\",\"recordingEnabled\":true}");
        mockMvc.perform(get("/api/lives/" + liveId).header("Authorization", host.bearer()))
            .andExpect(jsonPath("$.data.recordingEnabled").value(false));
        start(host, liveId);
        assertThat(recordingRepository.findByLiveId(dbId(liveId))).isEmpty();
    }

    // --- HLS fallback -------------------------------------------------------------------------

    @Test
    void hlsPlaylistIsAuthorizedOnlyWithItsOwnTokenWhileTheSessionIsOpen() throws Exception {
        User host = register("hls");
        User viewer = register("hlsfan");
        String liveId = startedLive(host);
        assertThat(playback(viewer, liveId).has("hlsUrl")).isFalse();

        Endpoint whip = publish(host, liveId, "pub-hls");
        JsonNode playback = playback(viewer, liveId);
        String hlsUrl = playback.get("hlsUrl").asText();
        assertThat(hlsUrl).startsWith("/live-hls/" + whip.stream() + ".m3u8?token=");

        hlsAuth(hlsUrl).andExpect(status().isNoContent()).andExpect(header().string("Cache-Control", "no-store"));
        hlsAuth(null).andExpect(status().isForbidden());
        hlsAuth("/live-hls/" + whip.stream() + ".m3u8").andExpect(status().isForbidden());
        hlsAuth("/live-hls/" + whip.stream() + ".m3u8?token=forged.token").andExpect(status().isForbidden());

        // The WHEP credential cannot open the playlist, and the HLS token cannot play WebRTC.
        Endpoint whep = Endpoint.parse(playback.get("whepUrl").asText());
        hlsAuth("/live-hls/" + whip.stream() + ".m3u8?token=" + whep.token()).andExpect(status().isForbidden());
        String hlsToken = Endpoint.parse(hlsUrl).token();
        hook("on_play", "play-hls", whip.stream(), "app=live&stream=" + whip.stream() + "&token=" + hlsToken)
            .andExpect(status().isForbidden());

        // A token issued for another LIVE's stream is refused.
        User otherHost = register("hlsother");
        String otherLive = startedLive(otherHost);
        Endpoint otherWhip = publish(otherHost, otherLive, "pub-hls-other");
        hlsAuth("/live-hls/" + otherWhip.stream() + ".m3u8?token=" + hlsToken).andExpect(status().isForbidden());

        // Still served while the host reconnects, refused once the LIVE ends.
        hook("on_unpublish", "pub-hls", whip.stream(), "").andExpect(status().isOk());
        hlsAuth(hlsUrl).andExpect(status().isNoContent());
        end(host, liveId);
        hlsAuth(hlsUrl).andExpect(status().isForbidden());
    }

    @Test
    void playbackReportsInterruptedWhileTheHostReconnects() throws Exception {
        User host = register("intr");
        User viewer = register("intrfan");
        String liveId = startedLive(host);
        assertThat(playback(viewer, liveId).get("interrupted").asBoolean()).isFalse();

        Endpoint whip = publish(host, liveId, "pub-intr");
        hook("on_unpublish", "pub-intr", whip.stream(), "").andExpect(status().isOk());
        JsonNode interrupted = playback(viewer, liveId);
        assertThat(interrupted.get("interrupted").asBoolean()).isTrue();
        assertThat(interrupted.get("publishing").asBoolean()).isFalse();
        assertThat(interrupted.has("whepUrl")).isFalse();

        Endpoint again = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());
        hook("on_publish", "pub-intr-2", again.stream(), again.query()).andExpect(status().isOk());
        assertThat(playback(viewer, liveId).get("interrupted").asBoolean()).isFalse();
    }

    // --- DVR hook -----------------------------------------------------------------------------

    @Test
    void dvrFilesAreAttachedOnlyToRecordingLivesAndOtherwiseDeleted() throws Exception {
        User host = register("dvr");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-dvr");
        long liveDbId = dbId(liveId);
        LiveRecording recording = recordingRepository.saveAndFlush(new LiveRecording(liveDbId, host.id(), LocalDateTime.now()));

        Path kept = dvrFile(whip.stream() + ".1700000000000.flv");
        dvrHook(whip.stream(), DVR_DIR.toString(), kept.getFileName().toString()).andExpect(status().isOk());
        dvrHook(whip.stream(), null, kept.toString()).andExpect(status().isOk());
        assertThat(kept).exists();
        assertThat(segmentRepository.findByRecordingIdOrderByIdAsc(recording.getId())).hasSize(1);

        // A LIVE without recording: the file is removed so the disk cannot fill up.
        User other = register("dvrnorec");
        String otherLive = startedLive(other);
        Endpoint otherWhip = publish(other, otherLive, "pub-dvr-other");
        Path discarded = dvrFile(otherWhip.stream() + ".1700000000001.flv");
        dvrHook(otherWhip.stream(), null, discarded.toString()).andExpect(status().isOk());
        assertThat(discarded).doesNotExist();

        // Paths outside the DVR directory are never touched.
        Path outside = Files.writeString(Files.createTempFile("vibely-outside", ".flv"), "x");
        dvrHook(otherWhip.stream(), DVR_DIR.toString(), outside.toString()).andExpect(status().isOk());
        dvrHook(otherWhip.stream(), DVR_DIR.toString(), "../" + outside.getFileName()).andExpect(status().isOk());
        assertThat(outside).exists();
        Files.deleteIfExists(outside);
    }

    // --- analytics / replay -------------------------------------------------------------------

    @Test
    void analyticsAreRecordedOnceWhenTheLiveEndsAndOnlyForTheHost() throws Exception {
        User host = register("stats");
        User stranger = register("statsfan");
        String liveId = startedLive(host);
        Endpoint whip = publish(host, liveId, "pub-stats");

        mockMvc.perform(get("/api/lives/" + liveId + "/analytics").header("Authorization", host.bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_LIVE_STATE"));

        hook("on_unpublish", "pub-stats", whip.stream(), "").andExpect(status().isOk());
        Endpoint again = Endpoint.parse(publishCredential(host, liveId).get("whipUrl").asText());
        hook("on_publish", "pub-stats-2", again.stream(), again.query()).andExpect(status().isOk());
        end(host, liveId);

        mockMvc.perform(get("/api/lives/" + liveId + "/analytics").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.liveId").value(liveId))
            .andExpect(jsonPath("$.data.reconnectCount").value(1))
            .andExpect(jsonPath("$.data.endReason").value("host"));
        mockMvc.perform(get("/api/lives/" + liveId + "/analytics").header("Authorization", stranger.bearer()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("LIVE_NOT_FOUND"));
        mockMvc.perform(get("/api/lives/" + liveId + "/analytics")).andExpect(status().isUnauthorized());
    }

    @Test
    void replayIsNotFoundWithoutRecordingAndRequiresSignIn() throws Exception {
        User host = register("norep");
        String liveId = startedLive(host);
        end(host, liveId);

        mockMvc.perform(get("/api/lives/" + liveId + "/replay").header("Authorization", host.bearer()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("REPLAY_NOT_FOUND"));
        mockMvc.perform(get("/api/lives/" + liveId + "/replay")).andExpect(status().isUnauthorized());
    }

    @Test
    void recordingInProgressIsVisibleToTheHostOnly() throws Exception {
        User host = register("recview");
        User stranger = register("recviewfan");
        String liveId = startedLive(host);
        recordingRepository.saveAndFlush(new LiveRecording(dbId(liveId), host.id(), LocalDateTime.now()));

        mockMvc.perform(get("/api/lives/" + liveId + "/replay").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
            .andExpect(jsonPath("$.data.status").value("RECORDING"))
            .andExpect(jsonPath("$.data.isOwner").value(true))
            .andExpect(jsonPath("$.data.playbackUrl").doesNotExist());
        mockMvc.perform(get("/api/lives/" + liveId + "/replay").header("Authorization", stranger.bearer()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("REPLAY_NOT_FOUND"));
    }

    // --- limits -------------------------------------------------------------------------------

    @Test
    void liveExceedingTheMaximumDurationIsEndedBySystem() throws Exception {
        User host = register("long");
        String liveId = startedLive(host);
        String fresh = startedLive(register("short"));
        long id = dbId(liveId);
        jdbcTemplate.update("update lives set started_at = ? where id = ?", LocalDateTime.now().minusMinutes(241), id);

        limitsScheduler.enforceMaxDuration();
        limitsScheduler.enforceMaxDuration();

        mockMvc.perform(get("/api/lives/" + liveId)).andExpect(jsonPath("$.data.status").value("ENDED"));
        mockMvc.perform(get("/api/lives/" + fresh)).andExpect(jsonPath("$.data.status").value("LIVE"));
        mockMvc.perform(get("/api/lives/" + liveId + "/analytics").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.endReason").value("max_duration"));
    }

    // --- helpers ------------------------------------------------------------------------------

    private record User(long id, String email, String token) {
        String bearer() {
            return "Bearer " + token;
        }
    }

    private record Endpoint(String stream, String token, String query) {
        static Endpoint parse(String url) {
            MultiValueMap<String, String> params = UriComponentsBuilder.fromUriString(url).build().getQueryParams();
            return new Endpoint(params.getFirst("stream"), params.getFirst("token"), url.substring(url.indexOf('?') + 1));
        }
    }

    private static Path createTempDir() {
        try {
            return Files.createTempDirectory("vibely-dvr-test").toAbsolutePath().normalize();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static Path dvrFile(String name) throws IOException {
        return Files.writeString(DVR_DIR.resolve(name), "flv");
    }

    private long dbId(String liveId) {
        Live live = liveRepository.findWithHostByPublicId(UUID.fromString(liveId)).orElseThrow();
        return live.getId();
    }

    private ResultActions hlsAuth(String originalUri) throws Exception {
        var request = get(HLS_AUTH);
        if (originalUri != null) {
            request.header("X-Original-URI", originalUri);
        }
        return mockMvc.perform(request);
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
        return data(mockMvc.perform(get("/api/lives/" + liveId + "/playback").header("Authorization", viewer.bearer())));
    }

    private ResultActions hook(String action, String clientId, String stream, String param) throws Exception {
        Map<String, Object> body = baseHook(action, clientId, stream);
        body.put("param", param);
        return postHook(body);
    }

    private ResultActions dvrHook(String stream, String cwd, String file) throws Exception {
        Map<String, Object> body = baseHook("on_dvr", "pub-dvr", stream);
        body.put("param", "");
        body.put("cwd", cwd);
        body.put("file", file);
        return postHook(body);
    }

    private Map<String, Object> baseHook(String action, String clientId, String stream) {
        Map<String, Object> body = new HashMap<>();
        body.put("server_id", "vid-test");
        body.put("action", action);
        body.put("client_id", clientId);
        body.put("ip", "127.0.0.1");
        body.put("vhost", "__defaultVhost__");
        body.put("app", "live");
        body.put("stream", stream);
        return body;
    }

    private ResultActions postHook(Map<String, Object> body) throws Exception {
        return mockMvc.perform(post(HOOK_PATH)
            .param("hook_token", HOOK_TOKEN)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)));
    }

    private User register(String prefix) throws Exception {
        int sequence = SEQUENCE.incrementAndGet();
        String username = ("p4_" + prefix + "_" + sequence + "_" + Long.toString(System.nanoTime() % 100000, 36));
        String email = username + "@vibely.dev";
        String payload = """
            {"username":"%s","email":"%s","password":"secret123","birthDate":"2000-01-15"}
            """.formatted(username, email);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .with(request -> {
                    request.setRemoteAddr("10.44." + (sequence / 250) + "." + (sequence % 250 + 1));
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
        String liveId = createLive(host, "{\"title\":\"phase4 test\",\"category\":\"music\"}");
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

    private JsonNode data(ResultActions actions) throws Exception {
        MvcResult result = actions.andReturn();
        int status = result.getResponse().getStatus();
        assertThat(status).as(result.getResponse().getContentAsString()).isBetween(200, 299);
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }
}
