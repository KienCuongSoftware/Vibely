package com.vibely.backend.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.search.dto.SearchHistoryItemDto;
import com.vibely.backend.search.dto.SearchTrendingResponseDto;
import com.vibely.backend.search.entity.SearchHistory;
import com.vibely.backend.search.entity.SearchTrend;
import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.search.repository.SearchHistoryRepository;
import com.vibely.backend.search.repository.SearchQueryRepository;
import com.vibely.backend.search.repository.SearchTrendRepository;
import com.vibely.backend.search.service.SearchRankingService;
import com.vibely.backend.search.service.SearchService;
import com.vibely.backend.search.service.SearchSuggestionCacheService;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private SearchHistoryRepository searchHistoryRepository;

    @Mock
    private SearchTrendRepository searchTrendRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SearchQueryRepository searchQueryRepository;

    @Mock
    private SearchRankingService searchRankingService;

    @Mock
    private SearchSuggestionCacheService suggestionCacheService;

    @Mock
    private MediaUrlPresigner mediaUrlPresigner;

    @Mock
    private UserAvatarResolver userAvatarResolver;

    private SearchService searchService;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(
            searchHistoryRepository,
            searchTrendRepository,
            userRepository,
            searchQueryRepository,
            searchRankingService,
            suggestionCacheService,
            mediaUrlPresigner,
            userAvatarResolver,
            8,
            4
        );
    }

    @Test
    void trendingReturnsRankedItems() {
        SearchTrend trend = new SearchTrend();
        trend.setKeyword("vibely");
        trend.setSearchCount(42L);
        trend.setLastSearchedAt(LocalDateTime.now());
        when(searchTrendRepository.findAllByOrderBySearchCountDescLastSearchedAtDesc(any(Pageable.class)))
            .thenReturn(List.of(trend));

        SearchTrendingResponseDto response = searchService.trending(10);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).keyword()).isEqualTo("vibely");
        assertThat(response.items().get(0).searchCount()).isEqualTo(42L);
    }

    @Test
    void recordHistoryRejectsBlankQuery() {
        User user = new User();
        user.setEmail("viewer@vibely.dev");
        when(userRepository.findByEmail("viewer@vibely.dev")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> searchService.recordHistory("viewer@vibely.dev", "   "))
            .isInstanceOf(BadRequestException.class);
    }

    @Test
    void recordHistoryPersistsQueryAndIncrementsTrend() {
        User user = new User();
        user.setEmail("viewer@vibely.dev");
        when(userRepository.findByEmail("viewer@vibely.dev")).thenReturn(Optional.of(user));
        when(searchTrendRepository.findByKeyword("dance")).thenReturn(Optional.empty());
        when(searchHistoryRepository.save(any(SearchHistory.class))).thenAnswer(invocation -> {
            SearchHistory row = invocation.getArgument(0);
            row.getClass(); // keep reference
            return row;
        });
        when(searchHistoryRepository.countByUser_Id(any())).thenReturn(1L);

        SearchHistoryItemDto saved = searchService.recordHistory("viewer@vibely.dev", "  Dance  ");

        assertThat(saved.query()).isEqualTo("Dance");
        ArgumentCaptor<SearchTrend> trendCaptor = ArgumentCaptor.forClass(SearchTrend.class);
        verify(searchTrendRepository).save(trendCaptor.capture());
        assertThat(trendCaptor.getValue().getKeyword()).isEqualTo("dance");
        assertThat(trendCaptor.getValue().getSearchCount()).isEqualTo(1L);
    }

    @Test
    void clearHistoryDeletesRowsForUser() {
        User user = new User();
        user.setEmail("viewer@vibely.dev");
        user.setId(7L);
        when(userRepository.findByEmail("viewer@vibely.dev")).thenReturn(Optional.of(user));

        searchService.clearHistory("viewer@vibely.dev");

        verify(searchHistoryRepository).deleteAllByUserId(eq(7L));
    }
}
