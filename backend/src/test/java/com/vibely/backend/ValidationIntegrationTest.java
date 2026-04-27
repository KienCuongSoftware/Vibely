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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ValidationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldRejectInvalidRegisterPayload() throws Exception {
        String invalidRegister = """
            {
              "username":"",
              "email":"not-an-email",
              "password":"123"
            }
            """;

        mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(invalidRegister)
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectEmptyCommentContent() throws Exception {
        String registerPayload = """
            {
              "username":"comment_tester",
              "email":"comment@vibely.dev",
              "password":"secret123"
            }
            """;

        MvcResult registerResult = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(registerPayload)
            )
            .andExpect(status().isOk())
            .andReturn();

        JsonNode registerJson = objectMapper.readTree(registerResult.getResponse().getContentAsString());
        String token = registerJson.get("data").get("accessToken").asText();

        String videoPayload = """
            {
              "title":"Validation Clip",
              "description":"validation",
              "videoUrl":"https://cdn.example.com/validation.mp4"
            }
            """;

        long videoId = objectMapper.readTree(
                mockMvc.perform(
                        post("/api/videos")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(videoPayload)
                    )
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString()
            )
            .get("data")
            .get("id")
            .asLong();

        mockMvc.perform(
                post("/api/videos/" + videoId + "/comments")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"content\":\"   \"}")
            )
            .andExpect(status().isBadRequest());
    }
}
