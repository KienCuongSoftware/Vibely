package com.vibely.backend.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vibely.backend.search.repository.SearchUserProjection;
import com.vibely.backend.search.repository.SearchVideoProjection;
import com.vibely.backend.search.service.SearchRankingService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class SearchRankingServiceTest {

    private final SearchRankingService rankingService = new SearchRankingService();

    @Test
    void userExactMatchScoresHighest() {
        assertThat(rankingService.scoreUserTextMatch("dance", "dance")).isEqualTo(100);
        assertThat(rankingService.scoreUserTextMatch("dance", "dancequeen")).isEqualTo(80);
        assertThat(rankingService.scoreUserTextMatch("dance", "pro_dance")).isEqualTo(50);
        assertThat(rankingService.scoreUserTextMatch("dance", "cooking")).isZero();
    }

    @Test
    void userRankingPrefersUsernameExactOverDisplayContains() {
        SearchUserProjection exact = mock(SearchUserProjection.class);
        when(exact.getUsername()).thenReturn("dance");
        when(exact.getDisplayName()).thenReturn("Cooking");

        SearchUserProjection contains = mock(SearchUserProjection.class);
        when(contains.getUsername()).thenReturn("notrelated");
        when(contains.getDisplayName()).thenReturn("I love dance moves");

        assertThat(rankingService.scoreUser(exact, "dance")).isGreaterThan(rankingService.scoreUser(contains, "dance"));
    }

    @Test
    void videoRankingBoostsEngagementAndFreshness() {
        SearchVideoProjection fresh = mock(SearchVideoProjection.class);
        when(fresh.getTitle()).thenReturn("dance");
        when(fresh.getDescription()).thenReturn("");
        when(fresh.getTitleMatch()).thenReturn(true);
        when(fresh.getDescriptionMatch()).thenReturn(false);
        when(fresh.getHashtagMatch()).thenReturn(false);
        when(fresh.getViewCount()).thenReturn(10L);
        when(fresh.getLikeCount()).thenReturn(2L);
        when(fresh.getCreatedAt()).thenReturn(LocalDateTime.now().minusHours(2));

        SearchVideoProjection stale = mock(SearchVideoProjection.class);
        when(stale.getTitle()).thenReturn("dance");
        when(stale.getDescription()).thenReturn("");
        when(stale.getTitleMatch()).thenReturn(true);
        when(stale.getDescriptionMatch()).thenReturn(false);
        when(stale.getHashtagMatch()).thenReturn(false);
        when(stale.getViewCount()).thenReturn(10L);
        when(stale.getLikeCount()).thenReturn(2L);
        when(stale.getCreatedAt()).thenReturn(LocalDateTime.now().minusDays(120));

        assertThat(rankingService.scoreVideo(fresh, "dance"))
            .isGreaterThan(rankingService.scoreVideo(stale, "dance"));
    }
}
