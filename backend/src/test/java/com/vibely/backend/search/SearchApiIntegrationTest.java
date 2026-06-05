package com.vibely.backend.search;

import static org.hamcrest.Matchers.hasItems;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vibely.backend.search.repository.SearchHistoryRepository;
import com.vibely.backend.user.Role;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SearchApiIntegrationTest {

  private static final String VIEWER_EMAIL = "search-viewer@vibely.dev";

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private SearchHistoryRepository searchHistoryRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  private String viewerUsername;

  @BeforeEach
  void seedViewer() {
    viewerUsername = "search_viewer_" + UUID.randomUUID().toString().substring(0, 8);
    User user = new User();
    user.setUsername(viewerUsername);
    user.setDisplayName("Search Viewer");
    user.setEmail(VIEWER_EMAIL);
    user.setPasswordHash(passwordEncoder.encode("secret123"));
    user.setRole(Role.USER);
    user.setOnboardingCompleted(true);
    userRepository.save(user);
  }

  @Test
  void trendingIsPublic() throws Exception {
    mockMvc
        .perform(get("/api/search/trending"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items").isArray());
  }

  @Test
  void historyLifecycleRequiresAuth() throws Exception {
    mockMvc.perform(get("/api/search/history")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/search/history")
                .with(user(VIEWER_EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"query\":\"Vibely Dance\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.query").value("Vibely Dance"));

    mockMvc
        .perform(get("/api/search/history").with(user(VIEWER_EMAIL)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].query").value("Vibely Dance"));

    long historyId =
        searchHistoryRepository
            .findByUser_IdOrderByCreatedAtDesc(
                userRepository.findByEmail(VIEWER_EMAIL).orElseThrow().getId(),
                PageRequest.of(0, 1))
            .get(0)
            .getId();

    mockMvc
        .perform(
            post("/api/search/history")
                .with(user(VIEWER_EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"query\":\"other search\"}"))
        .andExpect(status().isCreated());

    mockMvc
        .perform(delete("/api/search/history/" + historyId).with(user(VIEWER_EMAIL)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/search/history").with(user(VIEWER_EMAIL)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(1))
        .andExpect(jsonPath("$.data[0].query").value("other search"));

    mockMvc
        .perform(get("/api/search/trending?limit=50"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath(
                "$.data.items[*].keyword",
                hasItems("vibely dance", "other search")));

    mockMvc
        .perform(delete("/api/search/history").with(user(VIEWER_EMAIL)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/search/history").with(user(VIEWER_EMAIL)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isEmpty());
  }
}
