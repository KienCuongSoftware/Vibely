package com.vibely.backend.live;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.live.service.LiveViewerService;
import com.vibely.backend.live.websocket.LiveStompSubscriptionInterceptor;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static java.util.Objects.requireNonNull;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The test profile has no OAuth2 client registrations.
@SpringBootTest(properties = "app.oauth2.enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LiveIntegrationTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LiveStompSubscriptionInterceptor subscriptionInterceptor;

    @Autowired
    private LiveViewerService viewerService;

    // --- create -------------------------------------------------------------------------------

    @Test
    void createsLiveForAuthenticatedHostAndIgnoresClientHostId() throws Exception {
        User host = register("host");
        User other = register("other");

        String body = """
            {"title":"  My first LIVE  ","category":"pubg","hostId":%d,"visibility":"PUBLIC"}
            """.formatted(other.id());
        mockMvc.perform(post("/api/lives").header("Authorization", host.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.title").value("My first LIVE"))
            .andExpect(jsonPath("$.data.category").value("PUBG"))
            .andExpect(jsonPath("$.data.status").value("CREATED"))
            .andExpect(jsonPath("$.data.host.id").value(host.id()))
            .andExpect(jsonPath("$.data.isOwner").value(true))
            .andExpect(jsonPath("$.data.streamKey").doesNotExist())
            .andExpect(jsonPath("$.data.host.email").doesNotExist());
    }

    @Test
    void rejectsCreateWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/lives").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\",\"category\":\"music\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidCategory() throws Exception {
        User host = register("badcat");
        mockMvc.perform(post("/api/lives").header("Authorization", host.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\",\"category\":\"cooking\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_CATEGORY"));
    }

    // --- lifecycle ----------------------------------------------------------------------------

    @Test
    void hostStartsLive() throws Exception {
        User host = register("starter");
        String liveId = createLive(host, "music");

        mockMvc.perform(post("/api/lives/" + liveId + "/start").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("LIVE"))
            .andExpect(jsonPath("$.data.startedAt").isNotEmpty());
    }

    @Test
    void cannotStartLiveTwice() throws Exception {
        User host = register("twice");
        String liveId = startedLive(host, "music");

        mockMvc.perform(post("/api/lives/" + liveId + "/start").header("Authorization", host.bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("LIVE_ALREADY_STARTED"));
    }

    @Test
    void nonHostCannotStartVisibleLive() throws Exception {
        User host = register("owner");
        User intruder = register("intruder");
        String liveId = createLive(host, "chat");

        // CREATED LIVEs are invisible to others, so the existence is not revealed.
        mockMvc.perform(post("/api/lives/" + liveId + "/start").header("Authorization", intruder.bearer()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("LIVE_NOT_FOUND"));
    }

    @Test
    void hostCannotRunTwoLivesAtOnce() throws Exception {
        User host = register("double");
        startedLive(host, "music");
        String second = createLive(host, "food");

        mockMvc.perform(post("/api/lives/" + second + "/start").header("Authorization", host.bearer()))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("HOST_ALREADY_LIVE"));
    }

    @Test
    void hostEndsLiveAndSecondEndIsRejected() throws Exception {
        User host = register("ender");
        String liveId = startedLive(host, "outdoor");

        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ENDED"))
            .andExpect(jsonPath("$.data.endedAt").isNotEmpty())
            .andExpect(jsonPath("$.data.viewerCount").value(0));

        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("LIVE_ALREADY_ENDED"));
    }

    @Test
    void nonHostCannotEndLive() throws Exception {
        User host = register("keeper");
        User viewer = register("viewer");
        String liveId = startedLive(host, "gaming");

        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", viewer.bearer()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("NOT_LIVE_HOST"));
    }

    @Test
    void cannotEndLiveThatNeverStarted() throws Exception {
        User host = register("early");
        String liveId = createLive(host, "music");

        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_LIVE_STATE"));
    }

    // --- read / discovery ---------------------------------------------------------------------

    @Test
    void guestReadsBroadcastingLiveWithoutCredentials() throws Exception {
        User host = register("public");
        String liveId = startedLive(host, "chat");

        mockMvc.perform(get("/api/lives/" + liveId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(liveId))
            .andExpect(jsonPath("$.data.status").value("LIVE"))
            .andExpect(jsonPath("$.data.isOwner").value(false))
            .andExpect(jsonPath("$.data.playback").doesNotExist())
            .andExpect(jsonPath("$.data.streamKey").doesNotExist());
    }

    @Test
    void returnsErrorCodesForUnknownAndMalformedIds() throws Exception {
        mockMvc.perform(get("/api/lives/0190f3a2-7c1d-7b8e-9f00-123456789abc"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("LIVE_NOT_FOUND"));
        mockMvc.perform(get("/api/lives/not-a-uuid"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_LIVE_ID"));
    }

    @Test
    void discoveryListsOnlyBroadcastingLives() throws Exception {
        User host = register("disc");
        String marker = "mk" + SEQUENCE.incrementAndGet() + System.nanoTime();
        String created = createLive(host, "pubg", marker + " created");
        String live = startedLive(register("disc2"), "freefire", marker + " live");
        String ended = startedLive(register("disc3"), "pubg", marker + " ended");
        mockMvc.perform(post("/api/lives/" + ended + "/end").header("Authorization", bearerOf(ended)))
            .andExpect(status().isOk());

        JsonNode items = data(mockMvc.perform(get("/api/lives").param("q", marker).param("category", "gaming")))
            .get("items");
        assertThat(ids(items)).containsExactly(live);
        assertThat(ids(items)).doesNotContain(created, ended);

        JsonNode endedItems = data(mockMvc.perform(get("/api/lives").param("q", marker).param("status", "ENDED")))
            .get("items");
        assertThat(ids(endedItems)).containsExactly(ended);

        mockMvc.perform(get("/api/lives").param("status", "CREATED"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void exposesFollowStateOfViewer() throws Exception {
        User host = register("followed");
        User fan = register("fan");
        String liveId = startedLive(host, "music");

        mockMvc.perform(post("/api/follows/" + host.id()).header("Authorization", fan.bearer()))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/lives/" + liveId).header("Authorization", fan.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.isFollowing").value(true));
    }

    // --- comments -----------------------------------------------------------------------------

    @Test
    void viewerCommentsAndHistoryReturnsIt() throws Exception {
        User host = register("chatter");
        User viewer = register("talker");
        String liveId = startedLive(host, "chat");

        mockMvc.perform(comment(liveId, viewer, "  hello LIVE  ", "c-1"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.content").value("hello LIVE"))
            .andExpect(jsonPath("$.data.clientId").value("c-1"))
            .andExpect(jsonPath("$.data.author.id").value(viewer.id()));

        mockMvc.perform(get("/api/lives/" + liveId + "/comments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].content").value("hello LIVE"));
    }

    @Test
    void rejectsCommentsWhenDisabled() throws Exception {
        User host = register("quiet");
        User viewer = register("loud");
        String liveId = createLiveWithBody(host, "{\"title\":\"quiet\",\"category\":\"chat\",\"allowComments\":false}");
        start(host, liveId);

        mockMvc.perform(comment(liveId, viewer, "hi", null))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("COMMENTS_DISABLED"));
    }

    @Test
    void validatesCommentContent() throws Exception {
        User host = register("strict");
        User viewer = register("verbose");
        String liveId = startedLive(host, "chat");

        mockMvc.perform(comment(liveId, viewer, "   ", null))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("COMMENT_EMPTY"));
        mockMvc.perform(comment(liveId, viewer, "x".repeat(151), null))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("COMMENT_TOO_LONG"));
    }

    @Test
    void rejectsCommentsOnLiveThatIsNotBroadcasting() throws Exception {
        User host = register("offair");
        User viewer = register("late");
        String liveId = startedLive(host, "chat");
        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isOk());

        mockMvc.perform(comment(liveId, viewer, "too late", null))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("LIVE_NOT_ACTIVE"));
    }

    @Test
    void rateLimitsChatPerUser() throws Exception {
        User host = register("limiter");
        User spammer = register("spammer");
        String liveId = startedLive(host, "chat");

        for (int index = 0; index < 5; index++) {
            mockMvc.perform(comment(liveId, spammer, "msg " + index, null)).andExpect(status().isCreated());
        }
        mockMvc.perform(comment(liveId, spammer, "one too many", null))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.error.code").value("RATE_LIMIT_EXCEEDED"));
    }

    // --- moderation ---------------------------------------------------------------------------

    @Test
    void mutedUserCannotCommentAndBannedUserCannotView() throws Exception {
        User host = register("mod");
        User troll = register("troll");
        String liveId = startedLive(host, "chat");

        restrict(host, liveId, troll, "MUTE").andExpect(status().isOk());
        mockMvc.perform(comment(liveId, troll, "hi", null))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("USER_MUTED"));

        restrict(host, liveId, troll, "BAN").andExpect(status().isOk());
        mockMvc.perform(get("/api/lives/" + liveId).header("Authorization", troll.bearer()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("USER_BANNED"));
        mockMvc.perform(comment(liveId, troll, "hi", null))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("USER_BANNED"));
    }

    @Test
    void viewerCannotRestrictOthers() throws Exception {
        User host = register("boss");
        User viewer = register("peer");
        User target = register("target");
        String liveId = startedLive(host, "chat");

        restrict(viewer, liveId, target, "MUTE")
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("MODERATION_NOT_ALLOWED"));
    }

    // --- likes --------------------------------------------------------------------------------

    @Test
    void likesAreCountedAndClampedPerRequest() throws Exception {
        User host = register("liked");
        User fan = register("tapper");
        String liveId = startedLive(host, "music");

        mockMvc.perform(post("/api/lives/" + liveId + "/likes").header("Authorization", fan.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"count\":3}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accepted").value(3))
            .andExpect(jsonPath("$.data.likeCount").value(3));
        mockMvc.perform(post("/api/lives/" + liveId + "/likes").header("Authorization", fan.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"count\":100000}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accepted").value(100))
            .andExpect(jsonPath("$.data.likeCount").value(103));
        mockMvc.perform(post("/api/lives/" + liveId + "/likes").header("Authorization", fan.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"count\":0}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_LIKE_COUNT"));

        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.likeCount").value(103));
    }

    // --- realtime presence --------------------------------------------------------------------

    @Test
    void viewerCountTracksUniqueSubscribersAndNeverGoesNegative() throws Exception {
        User host = register("presence");
        User viewer = register("watcher");
        String liveId = startedLive(host, "chat");
        String topic = "/topic/live/" + liveId;

        subscribe(host, topic, "host-session", "sub-h");
        assertThat(viewerCount(liveId)).isZero();

        subscribe(viewer, topic, "tab-1", "sub-1");
        subscribe(viewer, topic, "tab-2", "sub-1");
        assertThat(viewerCount(liveId)).isEqualTo(1);

        unsubscribe("tab-1", "sub-1");
        assertThat(viewerCount(liveId)).isEqualTo(1);

        viewerService.leaveAll("tab-2");
        assertThat(viewerCount(liveId)).isZero();

        viewerService.leaveAll("tab-2");
        unsubscribe("tab-1", "sub-1");
        assertThat(viewerCount(liveId)).isZero();
    }

    @Test
    void cannotSubscribeToLiveThatIsNotBroadcasting() throws Exception {
        User host = register("closed");
        User viewer = register("knocker");
        String liveId = startedLive(host, "chat");
        mockMvc.perform(post("/api/lives/" + liveId + "/end").header("Authorization", host.bearer()))
            .andExpect(status().isOk());

        assertThatThrownBy(() -> subscribe(viewer, "/topic/live/" + liveId, "late-session", "sub-x"))
            .isInstanceOf(MessagingException.class);
    }

    // --- helpers ------------------------------------------------------------------------------

    private record User(long id, String email, String token) {
        String bearer() {
            return "Bearer " + token;
        }
    }

    private final java.util.Map<String, User> hostsByLive = new java.util.concurrent.ConcurrentHashMap<>();

    private User register(String prefix) throws Exception {
        int sequence = SEQUENCE.incrementAndGet();
        String username = ("lv_" + prefix + "_" + sequence + "_" + Long.toString(System.nanoTime() % 100000, 36));
        String email = username + "@vibely.dev";
        String payload = """
            {"username":"%s","email":"%s","password":"secret123","birthDate":"2000-01-15"}
            """.formatted(username, email);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .with(request -> {
                    request.setRemoteAddr("10.42." + (sequence / 250) + "." + (sequence % 250 + 1));
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        return new User(data.get("userId").asLong(), email, data.get("accessToken").asText());
    }

    private String createLive(User host, String category) throws Exception {
        return createLive(host, category, "LIVE " + category);
    }

    private String createLive(User host, String category, String title) throws Exception {
        return createLiveWithBody(host, "{\"title\":\"%s\",\"category\":\"%s\"}".formatted(title, category));
    }

    private String createLiveWithBody(User host, String body) throws Exception {
        JsonNode data = data(mockMvc.perform(post("/api/lives").header("Authorization", host.bearer())
            .contentType(MediaType.APPLICATION_JSON).content(body)));
        String liveId = data.get("id").asText();
        hostsByLive.put(liveId, host);
        return liveId;
    }

    private void start(User host, String liveId) throws Exception {
        mockMvc.perform(post("/api/lives/" + liveId + "/start").header("Authorization", host.bearer()))
            .andExpect(status().isOk());
    }

    private String startedLive(User host, String category) throws Exception {
        String liveId = createLive(host, category);
        start(host, liveId);
        return liveId;
    }

    private String startedLive(User host, String category, String title) throws Exception {
        String liveId = createLive(host, category, title);
        start(host, liveId);
        return liveId;
    }

    private String bearerOf(String liveId) {
        return requireNonNull(hostsByLive.get(liveId)).bearer();
    }

    private MockHttpServletRequestBuilder comment(String liveId, User author, String content, String clientId) throws Exception {
        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.put("content", content);
        body.put("clientId", clientId);
        return post("/api/lives/" + liveId + "/comments")
            .header("Authorization", author.bearer())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body));
    }

    private ResultActions restrict(User actor, String liveId, User target, String type) throws Exception {
        return mockMvc.perform(post("/api/lives/" + liveId + "/restrictions/" + target.id())
            .header("Authorization", actor.bearer())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"" + type + "\"}"));
    }

    private long viewerCount(String liveId) throws Exception {
        return data(mockMvc.perform(get("/api/lives/" + liveId + "/stats"))).get("viewerCount").asLong();
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

    private void unsubscribe(String sessionId, String subscriptionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.UNSUBSCRIBE);
        accessor.setSessionId(sessionId);
        accessor.setSubscriptionId(subscriptionId);
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

    private static List<String> ids(JsonNode items) {
        java.util.ArrayList<String> ids = new java.util.ArrayList<>();
        items.forEach(item -> ids.add(item.get("id").asText()));
        return ids;
    }
}
