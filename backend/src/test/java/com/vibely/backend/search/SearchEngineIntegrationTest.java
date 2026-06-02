package com.vibely.backend.search;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vibely.backend.explore.Hashtag;
import com.vibely.backend.explore.HashtagRepository;
import com.vibely.backend.explore.VideoHashtag;
import com.vibely.backend.explore.VideoHashtagRepository;
import com.vibely.backend.search.entity.SearchTrend;
import com.vibely.backend.search.repository.SearchTrendRepository;
import com.vibely.backend.user.Role;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SearchEngineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private HashtagRepository hashtagRepository;

    @Autowired
    private VideoHashtagRepository videoHashtagRepository;

    @Autowired
    private SearchTrendRepository searchTrendRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void seedSearchCorpus() {
        User author = new User();
        author.setUsername("dancemaster");
        author.setDisplayName("Dance Master");
        author.setEmail("dancemaster-search@vibely.dev");
        author.setPasswordHash(passwordEncoder.encode("secret123"));
        author.setRole(Role.USER);
        author.setOnboardingCompleted(true);
        userRepository.save(author);

        Video video = new Video();
        video.setAuthor(author);
        video.setTitle("Epic Dance Challenge");
        video.setDescription("Learn the latest dance moves");
        video.setVideoUrl("https://cdn.example.com/dance.mp4");
        video.setThumbnailUrl("https://cdn.example.com/dance.jpg");
        video.setStatus(VideoStatus.READY);
        videoRepository.save(video);

        Hashtag hashtag = new Hashtag();
        hashtag.setTag("dance");
        hashtagRepository.save(hashtag);
        videoHashtagRepository.save(new VideoHashtag(video, hashtag));

        SearchTrend trend = new SearchTrend();
        trend.setKeyword("dance");
        trend.setSearchCount(99L);
        trend.setLastSearchedAt(LocalDateTime.now());
        searchTrendRepository.save(trend);
    }

    @Test
    void usersEndpointRanksExactUsernameFirst() throws Exception {
        User other = new User();
        other.setUsername("notdance");
        other.setDisplayName("Contains dance in bio");
        other.setEmail("other-search@vibely.dev");
        other.setPasswordHash(passwordEncoder.encode("secret123"));
        other.setRole(Role.USER);
        other.setOnboardingCompleted(true);
        userRepository.save(other);

        mockMvc.perform(get("/api/search/users").param("q", "dancemaster"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].username").value("dancemaster"))
            .andExpect(jsonPath("$.data[0].matchScore").value(100));
    }

    @Test
    void videosEndpointReturnsReadyMatches() throws Exception {
        mockMvc.perform(get("/api/search/videos").param("q", "dance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].title").value("Epic Dance Challenge"))
            .andExpect(jsonPath("$.data[0].publicId").exists());
    }

    @Test
    void hashtagsEndpointSortsByUsageCount() throws Exception {
        Hashtag other = new Hashtag();
        other.setTag("dancemoves");
        hashtagRepository.save(other);

        mockMvc.perform(get("/api/search/hashtags").param("q", "dance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].tag").value("dance"))
            .andExpect(jsonPath("$.data[0].usageCount").value(1));
    }

    @Test
    void suggestEndpointReturnsGroupedPayload() throws Exception {
        mockMvc.perform(get("/api/search/suggest").param("q", "dance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.trending").isArray())
            .andExpect(jsonPath("$.data.users[0].username").value("dancemaster"))
            .andExpect(jsonPath("$.data.hashtags[0].tag").value("dance"))
            .andExpect(jsonPath("$.data.videos[0].title").value("Epic Dance Challenge"));
    }

    @Test
    void suggestWithoutQueryReturnsTrendingOnly() throws Exception {
        mockMvc.perform(get("/api/search/suggest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.trending[0].keyword").value("dance"))
            .andExpect(jsonPath("$.data.users").isEmpty())
            .andExpect(jsonPath("$.data.hashtags").isEmpty())
            .andExpect(jsonPath("$.data.videos").isEmpty());
    }
}
