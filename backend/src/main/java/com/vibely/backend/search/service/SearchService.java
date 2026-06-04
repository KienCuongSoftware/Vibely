package com.vibely.backend.search.service;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.search.dto.SearchHashtagResultDto;
import com.vibely.backend.search.dto.SearchHistoryItemDto;
import com.vibely.backend.search.dto.SearchSuggestResponseDto;
import com.vibely.backend.search.dto.SearchTrendItemDto;
import com.vibely.backend.search.dto.SearchTrendingResponseDto;
import com.vibely.backend.search.dto.SearchUserResultDto;
import com.vibely.backend.search.dto.SearchVideoResultDto;
import com.vibely.backend.search.entity.SearchHistory;
import com.vibely.backend.search.entity.SearchTrend;
import com.vibely.backend.search.repository.SearchHashtagProjection;
import com.vibely.backend.search.repository.SearchHistoryRepository;
import com.vibely.backend.search.repository.SearchQueryRepository;
import com.vibely.backend.search.repository.SearchTrendRepository;
import com.vibely.backend.search.repository.SearchUserProjection;
import com.vibely.backend.search.repository.SearchVideoProjection;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchService {

    static final int DEFAULT_TRENDING_LIMIT = 20;
    static final int MAX_TRENDING_LIMIT = 50;
    static final int DEFAULT_HISTORY_LIMIT = 30;
    static final int MAX_HISTORY_LIMIT = 100;
    static final int MAX_HISTORY_PER_USER = 100;
    static final int DEFAULT_SEARCH_LIMIT = 20;
    static final int MAX_SEARCH_LIMIT = 50;
    static final int MAX_QUERY_LENGTH = 200;

    private final SearchHistoryRepository searchHistoryRepository;
    private final SearchTrendRepository searchTrendRepository;
    private final UserRepository userRepository;
    private final SearchQueryRepository searchQueryRepository;
    private final SearchRankingService searchRankingService;
    private final SearchSuggestionCacheService suggestionCacheService;
    private final MediaUrlPresigner mediaUrlPresigner;
    private final UserAvatarResolver userAvatarResolver;
    private final int suggestGroupLimit;
    private final int candidateMultiplier;

    public SearchService(
        SearchHistoryRepository searchHistoryRepository,
        SearchTrendRepository searchTrendRepository,
        UserRepository userRepository,
        SearchQueryRepository searchQueryRepository,
        SearchRankingService searchRankingService,
        SearchSuggestionCacheService suggestionCacheService,
        MediaUrlPresigner mediaUrlPresigner,
        UserAvatarResolver userAvatarResolver,
        @Value("${app.search.suggest-group-limit:8}") int suggestGroupLimit,
        @Value("${app.search.candidate-multiplier:4}") int candidateMultiplier
    ) {
        this.searchHistoryRepository = searchHistoryRepository;
        this.searchTrendRepository = searchTrendRepository;
        this.userRepository = userRepository;
        this.searchQueryRepository = searchQueryRepository;
        this.searchRankingService = searchRankingService;
        this.suggestionCacheService = suggestionCacheService;
        this.mediaUrlPresigner = mediaUrlPresigner;
        this.userAvatarResolver = userAvatarResolver;
        this.suggestGroupLimit = Math.max(1, suggestGroupLimit);
        this.candidateMultiplier = Math.max(2, candidateMultiplier);
    }

    @Transactional(readOnly = true)
    public SearchSuggestResponseDto suggest(String rawQuery) {
        String query = normalizeSearchTerm(rawQuery);
        if (query.isEmpty()) {
            return new SearchSuggestResponseDto(
                trendingItems(suggestGroupLimit),
                List.of(),
                List.of(),
                List.of()
            );
        }

        String cacheKey = SearchTextNormalizer.normalizeTrendKeyword(query);
        return suggestionCacheService.get(cacheKey).orElseGet(() -> {
            SearchSuggestResponseDto response = new SearchSuggestResponseDto(
                trendingMatching(query, suggestGroupLimit),
                searchUsers(query, suggestGroupLimit),
                searchHashtags(query, suggestGroupLimit),
                searchVideos(query, suggestGroupLimit)
            );
            suggestionCacheService.put(cacheKey, response);
            return response;
        });
    }

    @Transactional(readOnly = true)
    public List<SearchUserResultDto> searchUsers(String rawQuery, int limit) {
        String query = requireSearchTerm(rawQuery);
        int capped = capLimit(limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
        int candidateSize = Math.min(capped * candidateMultiplier, 200);
        return searchQueryRepository.findUserCandidates(query, PageRequest.of(0, candidateSize)).stream()
            .sorted(searchRankingService.userComparator(query))
            .limit(capped)
            .map(row -> toUserResult(row, query))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<SearchVideoResultDto> searchVideos(String rawQuery, int limit) {
        String query = requireSearchTerm(rawQuery);
        int capped = capLimit(limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
        int candidateSize = Math.min(capped * candidateMultiplier, 200);
        return searchQueryRepository.findVideoCandidates(query, PageRequest.of(0, candidateSize)).stream()
            .sorted(searchRankingService.videoComparator(query))
            .limit(capped)
            .map(row -> toVideoResult(row, query))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<SearchHashtagResultDto> searchHashtags(String rawQuery, int limit) {
        String query = requireSearchTerm(rawQuery);
        int capped = capLimit(limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
        return searchQueryRepository.findHashtagCandidates(query, PageRequest.of(0, capped)).stream()
            .sorted(Comparator.comparingLong(SearchHashtagProjection::getUsageCount).reversed()
                .thenComparing(row -> row.getTag() == null ? "" : row.getTag(), String.CASE_INSENSITIVE_ORDER))
            .map(this::toHashtagResult)
            .toList();
    }

    @Transactional(readOnly = true)
    public SearchTrendingResponseDto trending(int limit) {
        return new SearchTrendingResponseDto(trendingItems(limit));
    }

    private List<SearchTrendItemDto> trendingItems(int limit) {
        int capped = capLimit(limit, DEFAULT_TRENDING_LIMIT, MAX_TRENDING_LIMIT);
        return searchTrendRepository
            .findAllByOrderBySearchCountDescLastSearchedAtDesc(PageRequest.of(0, capped))
            .stream()
            .map(row -> new SearchTrendItemDto(row.getKeyword(), row.getSearchCount(), row.getLastSearchedAt()))
            .toList();
    }

    /** Gợi ý từ khóa khớp chuỗi đang gõ (không trả toàn bộ trending toàn site). */
    private List<SearchTrendItemDto> trendingMatching(String rawQuery, int limit) {
        String query = normalizeSearchTerm(rawQuery);
        if (query.isEmpty()) {
            return trendingItems(limit);
        }
        int capped = capLimit(limit, DEFAULT_TRENDING_LIMIT, MAX_TRENDING_LIMIT);
        return searchTrendRepository
            .findByKeywordContainingIgnoreCaseOrderBySearchCountDescLastSearchedAtDesc(
                query,
                PageRequest.of(0, capped)
            )
            .stream()
            .map(row -> new SearchTrendItemDto(row.getKeyword(), row.getSearchCount(), row.getLastSearchedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<SearchHistoryItemDto> history(String viewerEmail, int limit) {
        User user = requireUser(viewerEmail);
        int capped = capLimit(limit, DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
        return searchHistoryRepository
            .findByUser_IdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, capped))
            .stream()
            .map(row -> new SearchHistoryItemDto(row.getId(), row.getQuery(), row.getCreatedAt()))
            .toList();
    }

    @Transactional
    public SearchHistoryItemDto recordHistory(String viewerEmail, String rawQuery) {
        User user = requireUser(viewerEmail);
        String query = SearchTextNormalizer.normalizeQuery(rawQuery);
        if (query.isEmpty()) {
            throw new BadRequestException("Từ khóa tìm kiếm không hợp lệ.");
        }

        SearchHistory row = new SearchHistory();
        row.setUser(user);
        row.setQuery(query);
        SearchHistory saved = searchHistoryRepository.save(row);
        recordTrendKeyword(query);
        trimUserHistory(user.getId());
        return new SearchHistoryItemDto(saved.getId(), saved.getQuery(), saved.getCreatedAt());
    }

    @Transactional
    public void clearHistory(String viewerEmail) {
        User user = requireUser(viewerEmail);
        searchHistoryRepository.deleteAllByUserId(user.getId());
    }

    private SearchUserResultDto toUserResult(SearchUserProjection row, String query) {
        String avatar = resolveAvatarFromProjection(row.getGoogleAvatarUrl(), row.getAvatarUrl());
        return new SearchUserResultDto(
            row.getId(),
            row.getUsername(),
            row.getDisplayName(),
            avatar,
            searchRankingService.scoreUser(row, query)
        );
    }

    private SearchVideoResultDto toVideoResult(SearchVideoProjection row, String query) {
        UUID publicId = parsePublicId(row.getPublicId());
        return new SearchVideoResultDto(
            publicId,
            row.getTitle(),
            row.getDescription(),
            mediaUrlPresigner.presignPlaybackUrl(row.getThumbnailUrl()),
            mediaUrlPresigner.presignPlaybackUrl(row.getVideoUrl()),
            mediaUrlPresigner.presignPlaybackUrl(row.getMasterPlaylistUrl()),
            row.getAuthorId(),
            row.getAuthorUsername(),
            row.getAuthorDisplayName(),
            mediaUrlPresigner.presignPlaybackUrl(row.getAuthorAvatarUrl()),
            row.getViewCount() == null ? 0L : row.getViewCount(),
            row.getLikeCount() == null ? 0L : row.getLikeCount(),
            row.getCreatedAt(),
            searchRankingService.scoreVideo(row, query)
        );
    }

    private SearchHashtagResultDto toHashtagResult(SearchHashtagProjection row) {
        return new SearchHashtagResultDto(
            row.getId(),
            row.getTag(),
            row.getUsageCount() == null ? 0L : row.getUsageCount()
        );
    }

    private String resolveAvatarFromProjection(String googleAvatarUrl, String avatarUrl) {
        User proxy = new User();
        proxy.setGoogleAvatarUrl(googleAvatarUrl);
        proxy.setAvatarUrl(avatarUrl);
        return mediaUrlPresigner.presignPlaybackUrl(userAvatarResolver.resolve(proxy));
    }

    private void recordTrendKeyword(String query) {
        String keyword = SearchTextNormalizer.normalizeTrendKeyword(query);
        if (keyword.isEmpty()) {
            return;
        }
        SearchTrend trend = searchTrendRepository.findByKeyword(keyword).orElseGet(() -> {
            SearchTrend created = new SearchTrend();
            created.setKeyword(keyword);
            created.setSearchCount(0L);
            created.setLastSearchedAt(LocalDateTime.now());
            return created;
        });
        trend.incrementSearchCount();
        searchTrendRepository.save(trend);
    }

    private void trimUserHistory(Long userId) {
        long count = searchHistoryRepository.countByUser_Id(userId);
        if (count <= MAX_HISTORY_PER_USER) {
            return;
        }
        int excess = (int) (count - MAX_HISTORY_PER_USER);
        List<SearchHistory> oldest = searchHistoryRepository.findByUser_IdOrderByCreatedAtAsc(
            userId,
            PageRequest.of(0, excess)
        );
        searchHistoryRepository.deleteAll(oldest);
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new NotFoundException("Không tìm thấy người dùng.");
        }
        return userRepository.findByEmail(email.trim())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng."));
    }

    private String requireSearchTerm(String rawQuery) {
        String query = normalizeSearchTerm(rawQuery);
        if (query.isEmpty()) {
            throw new BadRequestException("Từ khóa tìm kiếm không hợp lệ.");
        }
        return query;
    }

    static String normalizeSearchTerm(String rawQuery) {
        String normalized = SearchTextNormalizer.normalizeQuery(rawQuery);
        if (normalized.startsWith("#")) {
            normalized = normalized.substring(1).trim();
        }
        if (normalized.length() > MAX_QUERY_LENGTH) {
            normalized = normalized.substring(0, MAX_QUERY_LENGTH);
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private static int capLimit(int limit, int defaultLimit, int maxLimit) {
        if (limit <= 0) {
            return defaultLimit;
        }
        return Math.min(limit, maxLimit);
    }

    private static UUID parsePublicId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
