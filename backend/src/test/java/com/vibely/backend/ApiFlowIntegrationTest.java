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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldRegisterLoginCreateVideoAndInteract() throws Exception {
        String registerPayload = """
            {
              "username":"demo_user",
              "email":"demo@vibely.dev",
              "password":"secret123",
              "bio":"hello",
              "birthDate":"2000-01-15"
            }
            """;

        MvcResult registerResult = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(registerPayload)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.avatarUrl").value("/images/users/default-avatar.jpeg"))
            .andReturn();

        JsonNode registerJson = objectMapper.readTree(registerResult.getResponse().getContentAsString());
        String token = registerJson.get("data").get("accessToken").asText();
        String refreshToken = registerJson.get("data").get("refreshToken").asText();

        String videoPayload = """
            {
              "title":"First Vibely Clip",
              "description":"test video",
              "videoUrl":"https://cdn.example.com/video-1.mp4",
              "thumbnailUrl":"https://cdn.example.com/thumb-1.jpg"
            }
            """;

        MvcResult videoResult = mockMvc.perform(
                post("/api/videos")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(videoPayload)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.publicId").isNotEmpty())
            .andReturn();

        String videoPublicId = objectMapper.readTree(videoResult.getResponse().getContentAsString())
            .get("data")
            .get("publicId")
            .asText();

        mockMvc.perform(get("/api/videos/123"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/feed?page=0&size=10&sort=latest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(10))
            .andExpect(jsonPath("$.data.items[0].title").value("First Vibely Clip"));

        mockMvc.perform(get("/api/feed?page=0&size=10&sort=trending-lite"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sort").value("trending_lite"));

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/likes")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/bookmarks")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                get("/api/videos/" + videoPublicId + "/me")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.liked").value(true))
            .andExpect(jsonPath("$.data.bookmarked").value(true));

        mockMvc.perform(
                get("/api/users/me/liked-videos?page=0&size=10")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].title").value("First Vibely Clip"));

        mockMvc.perform(
                get("/api/users/me/bookmarked-videos?page=0&size=10")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].title").value("First Vibely Clip"));

        mockMvc.perform(
                get("/api/users/me/videos?page=0&size=10")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sort").value("my-uploads"))
            .andExpect(jsonPath("$.data.items[0].title").value("First Vibely Clip"));

        mockMvc.perform(
                get("/api/studio/analytics/video/" + videoPublicId + "?days=7")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.days").value(7))
            .andExpect(jsonPath("$.data.periodViews").exists())
            .andExpect(jsonPath("$.data.periodLikes").exists())
            .andExpect(jsonPath("$.data.periodComments").exists())
            .andExpect(jsonPath("$.data.periodBookmarks").exists())
            .andExpect(jsonPath("$.data.video.publicId").value(videoPublicId))
            .andExpect(jsonPath("$.data.video.title").value("First Vibely Clip"))
            .andExpect(jsonPath("$.data.points").isArray())
            .andExpect(jsonPath("$.data.playbackSampleSize").exists())
            .andExpect(jsonPath("$.data.retention").isArray())
            .andExpect(jsonPath("$.data.trafficSources").isArray())
            .andExpect(jsonPath("$.data.searchKeywords").isArray());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.viewCount").value(0));

        mockMvc.perform(post("/api/videos/" + videoPublicId + "/views"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.viewCount").value(0));

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/views")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"watchedMs\":500}")
            )
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.viewCount").value(0));

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/views")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"watchedMs\":2500,\"durationMs\":10000}")
            )
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.viewCount").value(1));

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/views")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"watchedMs\":3000,\"durationMs\":10000}")
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/views")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"watched_ms\":4000,\"duration_ms\":10000}")
            )
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.viewCount").value(3));

        mockMvc.perform(
                get("/api/studio/analytics/video/" + videoPublicId + "?days=7")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.playbackSampleSize").value(3))
            .andExpect(jsonPath("$.data.periodTotalWatchMs").value(9500))
            .andExpect(jsonPath("$.data.retention.length()").value(21))
            .andExpect(jsonPath("$.data.trafficSources.length()").value(4));

        mockMvc.perform(get("/api/users/demo_user/videos?page=0&size=10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sort").value("profile-uploads"))
            .andExpect(jsonPath("$.data.items[0].title").value("First Vibely Clip"));

        mockMvc.perform(
                put("/api/videos/" + videoPublicId)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Updated title\",\"description\":\"new desc\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("Updated title"));

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/comments")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"content\":\"Great!\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("Great!"));

        mockMvc.perform(get("/api/videos/" + videoPublicId + "/comments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].content").value("Great!"));

        mockMvc.perform(post("/api/videos/" + videoPublicId + "/shares"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.shareCount").value(1));

        MvcResult loginResult = mockMvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"demo@vibely.dev\",\"password\":\"secret123\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.avatarUrl").value("/images/users/default-avatar.jpeg"))
            .andReturn();

        String loginToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .get("data")
            .get("accessToken")
            .asText();
        assertThat(loginToken).isNotBlank();

        MvcResult refreshResult = mockMvc.perform(
                post("/api/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"refreshToken\":\"" + refreshToken + "\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andReturn();
        String refreshedAccessToken = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
            .get("data")
            .get("accessToken")
            .asText();
        assertThat(refreshedAccessToken).isNotBlank();

        mockMvc.perform(
                delete("/api/videos/" + videoPublicId + "/likes")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                get("/api/videos/" + videoPublicId + "/me")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.liked").value(false))
            .andExpect(jsonPath("$.data.bookmarked").value(true));

        mockMvc.perform(
                get("/api/users/me/liked-videos?page=0&size=10")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isEmpty());

        mockMvc.perform(
                delete("/api/videos/" + videoPublicId + "/bookmarks")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                get("/api/users/me/bookmarked-videos?page=0&size=10")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isEmpty());

        mockMvc.perform(
                post("/api/videos/" + videoPublicId + "/report")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"reason\":\"unsafe content\"}")
            )
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/feed?page=0&size=10&sort=latest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isEmpty());

        mockMvc.perform(
                delete("/api/videos/" + videoPublicId)
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/videos/" + videoPublicId))
            .andExpect(status().isNotFound());

        mockMvc.perform(
                get("/api/auth/me")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("demo@vibely.dev"))
            .andExpect(jsonPath("$.data.avatarUrl").value("/images/users/default-avatar.jpeg"));

        mockMvc.perform(
                post("/api/auth/logout")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"refreshToken\":\"" + refreshToken + "\"}")
            )
            .andExpect(status().isOk());
    }
}
