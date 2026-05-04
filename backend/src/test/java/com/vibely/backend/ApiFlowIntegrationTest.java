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
              "bio":"hello"
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
            .andExpect(jsonPath("$.data.id").isNumber())
            .andReturn();

        long videoId = objectMapper.readTree(videoResult.getResponse().getContentAsString())
            .get("data")
            .get("id")
            .asLong();

        mockMvc.perform(get("/api/feed?page=0&size=10&sort=latest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(10))
            .andExpect(jsonPath("$.data.items[0].title").value("First Vibely Clip"));

        mockMvc.perform(get("/api/feed?page=0&size=10&sort=trending-lite"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sort").value("trending_lite"));

        mockMvc.perform(
                post("/api/videos/" + videoId + "/likes")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                post("/api/videos/" + videoId + "/bookmarks")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                get("/api/videos/" + videoId + "/me")
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
                post("/api/videos/" + videoId + "/comments")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"content\":\"Great!\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("Great!"));

        mockMvc.perform(get("/api/videos/" + videoId + "/comments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].content").value("Great!"));

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
                delete("/api/videos/" + videoId + "/likes")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk());

        mockMvc.perform(
                get("/api/videos/" + videoId + "/me")
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
                delete("/api/videos/" + videoId + "/bookmarks")
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
                post("/api/videos/" + videoId + "/report")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"reason\":\"unsafe content\"}")
            )
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/feed?page=0&size=10&sort=latest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isEmpty());

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
