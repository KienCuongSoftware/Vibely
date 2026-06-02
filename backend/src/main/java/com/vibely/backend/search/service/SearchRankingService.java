package com.vibely.backend.search.service;

import com.vibely.backend.search.repository.SearchUserProjection;
import com.vibely.backend.search.repository.SearchVideoProjection;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class SearchRankingService {

    public static final int EXACT_MATCH_SCORE = 100;
    public static final int STARTS_WITH_SCORE = 80;
    public static final int CONTAINS_SCORE = 50;

    public int scoreUserTextMatch(String query, String field) {
        if (query == null || query.isBlank() || field == null || field.isBlank()) {
            return 0;
        }
        String q = query.trim().toLowerCase(Locale.ROOT);
        String value = field.trim().toLowerCase(Locale.ROOT);
        if (value.equals(q)) {
            return EXACT_MATCH_SCORE;
        }
        if (value.startsWith(q)) {
            return STARTS_WITH_SCORE;
        }
        if (value.contains(q)) {
            return CONTAINS_SCORE;
        }
        return 0;
    }

    public int scoreUser(SearchUserProjection row, String query) {
        int usernameScore = scoreUserTextMatch(query, row.getUsername());
        int displayScore = scoreUserTextMatch(query, row.getDisplayName());
        return Math.max(usernameScore, displayScore);
    }

    public double scoreVideo(SearchVideoProjection row, String query) {
        double textScore = scoreVideoTextMatch(row, query);
        long views = row.getViewCount() == null ? 0L : row.getViewCount();
        long likes = row.getLikeCount() == null ? 0L : row.getLikeCount();
        double engagement = Math.log1p(views) * 2.0 + Math.log1p(likes) * 4.0;
        double freshness = freshnessBoost(row.getCreatedAt());
        return textScore * 12.0 + engagement + freshness;
    }

    public double scoreVideoTextMatch(SearchVideoProjection row, String query) {
        String q = SearchTextNormalizer.normalizeQuery(query).toLowerCase(Locale.ROOT);
        if (q.isEmpty()) {
            return 0;
        }
        double titleScore = fieldTextScore(q, row.getTitle());
        double descriptionScore = fieldTextScore(q, row.getDescription()) * 0.65;
        double hashtagScore = Boolean.TRUE.equals(row.getHashtagMatch()) ? CONTAINS_SCORE * 0.9 : 0;
        if (Boolean.TRUE.equals(row.getTitleMatch()) && titleScore < CONTAINS_SCORE) {
            titleScore = CONTAINS_SCORE;
        }
        if (Boolean.TRUE.equals(row.getDescriptionMatch()) && descriptionScore < CONTAINS_SCORE * 0.65) {
            descriptionScore = CONTAINS_SCORE * 0.65;
        }
        return Math.max(titleScore, Math.max(descriptionScore, hashtagScore));
    }

    public Comparator<SearchUserProjection> userComparator(String query) {
        return Comparator
            .comparingInt((SearchUserProjection row) -> scoreUser(row, query))
            .reversed()
            .thenComparing(row -> row.getUsername() == null ? "" : row.getUsername(), String.CASE_INSENSITIVE_ORDER);
    }

    public Comparator<SearchVideoProjection> videoComparator(String query) {
        return Comparator
            .comparingDouble((SearchVideoProjection row) -> scoreVideo(row, query))
            .reversed()
            .thenComparing(row -> row.getCreatedAt(), Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private double fieldTextScore(String query, String field) {
        if (field == null || field.isBlank()) {
            return 0;
        }
        return scoreUserTextMatch(query, field);
    }

    private double freshnessBoost(LocalDateTime createdAt) {
        if (createdAt == null) {
            return 0;
        }
        long hours = Math.max(0, ChronoUnit.HOURS.between(createdAt, LocalDateTime.now()));
        return 24.0 / (1.0 + (hours / 24.0));
    }
}
