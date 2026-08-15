package com.vibely.backend.studio;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Truy vấn cho Studio → Phân tích kênh phải chạy được trên DB.
 * Bỏ qua phần share_analytics vì H2 không tạo được cột JSONB của bảng đó.
 */
@DataJpaTest
@ActiveProfiles("test")
class StudioChannelAnalyticsQueryTest {

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private VideoViewRepository videoViewRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Test
    void channelQueriesExecute() {
        LocalDateTime from = LocalDate.now().minusDays(6).atStartOfDay();
        List<Long> ids = List.of(1L, 2L);

        assertThat(followRepository.countDailyNewFollowersSince(1L, from)).isNotNull();
        assertThat(followRepository.countFollowersByRegion(1L)).isNotNull();
        assertThat(followRepository.findFollowerBirthDates(1L, PageRequest.of(0, 100))).isNotNull();
        assertThat(videoViewRepository.countGroupedByVideoIdsSince(ids, from)).isNotNull();
        assertThat(likeRepository.countGroupedByVideoIdsSince(ids, from)).isNotNull();
        assertThat(commentRepository.countGroupedByVideoIdsSince(ids, from)).isNotNull();
    }
}
