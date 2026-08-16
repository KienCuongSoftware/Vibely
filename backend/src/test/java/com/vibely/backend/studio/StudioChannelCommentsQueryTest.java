package com.vibely.backend.studio;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

/** Truy vấn cho Studio → Bình luận (cấp kênh) phải chạy được trên DB. */
@DataJpaTest
@ActiveProfiles("test")
class StudioChannelCommentsQueryTest {

    private static final List<VideoStatus> STATUSES = List.of(
        VideoStatus.READY,
        VideoStatus.PROCESSING,
        VideoStatus.RAW,
        VideoStatus.FAILED
    );

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private FollowRepository followRepository;

    @Test
    void channelCommentQueriesExecute() {
        var latestPage = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));

        assertThat(commentRepository.searchChannelComments(
            1L, STATUSES, "", "all", 0L, false, latestPage)).isNotNull();
        assertThat(commentRepository.searchChannelComments(
            1L, STATUSES, "xin chào", "others", 1000L, true, latestPage)).isNotNull();
        assertThat(commentRepository.searchChannelComments(
            1L, STATUSES, "", "me", 0L, false,
            PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "createdAt")))).isNotNull();

        assertThat(commentRepository.countRepliesGroupedByParentIds(List.of(1L, 2L))).isNotNull();
        assertThat(commentRepository.findParentIdsRepliedByUser(List.of(1L, 2L), 1L)).isNotNull();
        assertThat(followRepository.countFollowersGroupedByUserIds(List.of(1L, 2L))).isNotNull();
    }
}
