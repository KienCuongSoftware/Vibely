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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FollowingFeedIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnOnlyFollowedUsersVideosInFollowingFeed() throws Exception {
        AuthInfo creator = register("creator_user", "creator@vibely.dev");
        AuthInfo follower = register("follower_user", "follower@vibely.dev");

        createVideo(creator.token(), "Creator Clip");
        createVideo(follower.token(), "Follower Own Clip");

        mockMvc.perform(
                post("/api/follows/" + creator.userId())
                    .header("Authorization", "Bearer " + follower.token())
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                get("/api/feed/following")
                    .header("Authorization", "Bearer " + follower.token())
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].title").value("Creator Clip"));
    }

    private AuthInfo register(String username, String email) throws Exception {
        String payload = """
            {
              "username":"%s",
              "email":"%s",
              "password":"secret123"
            }
            """.formatted(username, email);

        MvcResult result = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload)
            )
            .andExpect(status().isOk())
            .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new AuthInfo(
            json.get("data").get("accessToken").asText(),
            json.get("data").get("userId").asLong()
        );
    }

    private void createVideo(String token, String title) throws Exception {
        String payload = """
            {
              "title":"%s",
              "description":"seed",
              "videoUrl":"https://cdn.example.com/%s.mp4"
            }
            """.formatted(title, title.toLowerCase().replace(" ", "-"));

        mockMvc.perform(
                post("/api/videos")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload)
            )
            .andExpect(status().isOk());
    }

    private record AuthInfo(String token, long userId) {
    }
}
