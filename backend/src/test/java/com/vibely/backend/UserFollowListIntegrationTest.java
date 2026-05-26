package com.vibely.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static java.util.Objects.requireNonNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserFollowListIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnFollowersAndFollowingListsForProfileModal() throws Exception {
        AuthInfo creator = register("creator_modal", "creator-modal@vibely.dev");
        AuthInfo viewer = register("viewer_modal", "viewer-modal@vibely.dev");
        AuthInfo friend = register("friend_modal", "friend-modal@vibely.dev");

        follow(creator, viewer.userId());
        follow(creator, friend.userId());
        follow(viewer, creator.userId());
        follow(viewer, friend.userId());

        mockMvc.perform(
                get("/api/users/creator_modal/following?page=0&size=20")
                    .header("Authorization", "Bearer " + viewer.token())
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].username").value("friend_modal"))
            .andExpect(jsonPath("$.data.items[0].followedByViewer").value(true))
            .andExpect(jsonPath("$.data.items[0].self").value(false))
            .andExpect(jsonPath("$.data.items[1].username").value("viewer_modal"))
            .andExpect(jsonPath("$.data.items[1].followedByViewer").value(false))
            .andExpect(jsonPath("$.data.items[1].self").value(true))
            .andExpect(jsonPath("$.data.hasNext").value(false));

        mockMvc.perform(
                get("/api/users/creator_modal/followers?page=0&size=20")
                    .header("Authorization", "Bearer " + viewer.token())
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].username").value("viewer_modal"))
            .andExpect(jsonPath("$.data.items[0].self").value(true))
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(20));
    }

    private AuthInfo register(String username, String email) throws Exception {
        String payload = """
            {
              "username":"%s",
              "email":"%s",
              "password":"secret123",
              "birthDate":"2000-01-15"
            }
            """.formatted(username, email);

        MvcResult result = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(requireNonNull(MediaType.APPLICATION_JSON))
                    .content(requireNonNull(payload))
            )
            .andExpect(status().isOk())
            .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new AuthInfo(
            json.get("data").get("accessToken").asText(),
            json.get("data").get("userId").asLong()
        );
    }

    private void follow(AuthInfo auth, long targetUserId) throws Exception {
        mockMvc.perform(
                post("/api/follows/" + targetUserId)
                    .header("Authorization", "Bearer " + auth.token())
            )
            .andExpect(status().isOk());
    }

    private record AuthInfo(String token, long userId) {
    }
}
