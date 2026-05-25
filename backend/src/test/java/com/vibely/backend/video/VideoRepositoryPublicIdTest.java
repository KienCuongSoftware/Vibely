package com.vibely.backend.video;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.user.Role;
import com.vibely.backend.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class VideoRepositoryPublicIdTest {

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByPublicIdResolvesVideo() {
        User author = new User();
        author.setUsername("pubid_user");
        author.setDisplayName("Pub Id");
        author.setEmail("pubid@test.dev");
        author.setPasswordHash("hash");
        author.setRole(Role.USER);
        entityManager.persist(author);

        Video video = new Video();
        video.setAuthor(author);
        video.setTitle("Public id test");
        video.setVideoUrl("https://cdn.example.com/v.mp4");
        video.setStatus(VideoStatus.READY);
        entityManager.persist(video);
        entityManager.flush();

        assertThat(video.getPublicId()).isNotNull();
        assertThat(videoRepository.findByPublicId(video.getPublicId()))
            .isPresent()
            .get()
            .extracting(Video::getId)
            .isEqualTo(video.getId());
    }
}
