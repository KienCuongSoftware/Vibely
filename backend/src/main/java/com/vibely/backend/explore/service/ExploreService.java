package com.vibely.backend.explore.service;

import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.ExploreCursorCodec;
import com.vibely.backend.explore.ExploreQueryRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.explore.dto.ExploreCategoryDto;
import com.vibely.backend.explore.dto.ExplorePageDto;
import com.vibely.backend.explore.dto.ExploreVideoCardDto;
import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoBookmarkRepository;
import com.vibely.backend.interaction.VideoViewRepository;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExploreService {
    private final ExploreQueryRepository exploreQueryRepository;
    private final CategoryRepository categoryRepository;
    private final VideoCategoryRepository videoCategoryRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final VideoBookmarkRepository bookmarkRepository;
    private final VideoViewRepository viewRepository;
    private final ExploreCacheService cacheService;

    public ExploreService(
        ExploreQueryRepository exploreQueryRepository,
        CategoryRepository categoryRepository,
        VideoCategoryRepository videoCategoryRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoBookmarkRepository bookmarkRepository,
        VideoViewRepository viewRepository,
        ExploreCacheService cacheService
    ) {
        this.exploreQueryRepository = exploreQueryRepository;
        this.categoryRepository = categoryRepository;
        this.videoCategoryRepository = videoCategoryRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.viewRepository = viewRepository;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<ExploreCategoryDto> categories() {
        return categoryRepository.findByEnabledTrueOrderByNameAsc().stream()
            .map(c -> new ExploreCategoryDto(c.getSlug(), c.getName(), videoCategoryRepository.countByCategoryId(c.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public ExplorePageDto trending(String cursor, int size) {
        return cachedPage("trending:" + (cursor == null ? "first" : cursor), () -> toPage(
            exploreQueryRepository.findTrending(score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1)),
            capSize(size)
        ));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto category(String slug, String cursor, int size) {
        String normalized = String.valueOf(slug == null ? "" : slug).trim().toLowerCase();
        return cachedPage("category:" + normalized + ":" + (cursor == null ? "first" : cursor), () -> toPage(
            exploreQueryRepository.findByCategorySlug(normalized, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1)),
            capSize(size)
        ));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto search(String q, String cursor, int size) {
        String query = String.valueOf(q == null ? "" : q).trim();
        return toPage(exploreQueryRepository.search(query, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1)), capSize(size));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto related(String publicId, int size) {
        return cachedPage("related:" + publicId, () -> toPage(
            exploreQueryRepository.related(java.util.UUID.fromString(publicId), PageRequest.of(0, capSize(size) + 1)),
            capSize(size)
        ));
    }

    private ExplorePageDto toPage(List<ExploreVideoProjection> rows, int size) {
        boolean hasNext = rows.size() > size;
        List<ExploreVideoProjection> data = rows.stream().limit(size).toList();
        List<Long> videoIds = ids(data);
        Map<Long, Long> likes = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(likeRepository.countGroupedByVideoIds(videoIds));
        Map<Long, Long> comments = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(commentRepository.countGroupedByVideoIds(videoIds));
        Map<Long, Long> bookmarks = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(bookmarkRepository.countGroupedByVideoIds(videoIds));
        Map<Long, Long> views = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(viewRepository.countGroupedByVideoIds(videoIds));
        List<ExploreVideoCardDto> cards = data.stream().map(v -> new ExploreVideoCardDto(
            v.getPublicId(),
            v.getAuthorId(),
            v.getAuthorUsername(),
            v.getAuthorDisplayName(),
            v.getAuthorAvatarUrl(),
            v.getTitle(),
            v.getDescription(),
            v.getVideoUrl(),
            v.getThumbnailUrl(),
            v.getMasterPlaylistUrl(),
            likes.getOrDefault(v.getId(), 0L),
            comments.getOrDefault(v.getId(), 0L),
            bookmarks.getOrDefault(v.getId(), 0L),
            v.getShareCount() == null ? 0L : v.getShareCount(),
            views.getOrDefault(v.getId(), 0L),
            v.getCreatedAt(),
            v.getExploreScore() == null ? 0 : v.getExploreScore()
        )).toList();
        String next = null;
        if (hasNext && !data.isEmpty()) {
            ExploreVideoProjection last = data.get(data.size() - 1);
            next = ExploreCursorCodec.encode(last.getExploreScore() == null ? 0 : last.getExploreScore(), last.getCreatedAt(), last.getId());
        }
        return new ExplorePageDto(cards, next, hasNext);
    }

    private List<Long> ids(List<ExploreVideoProjection> rows) {
        return rows.stream().map(ExploreVideoProjection::getId).toList();
    }

    private Map<Long, Long> groupCount(List<Object[]> tuples) {
        return tuples.stream().collect(Collectors.toMap(v -> ((Number) v[0]).longValue(), v -> ((Number) v[1]).longValue()));
    }

    private int capSize(int size) {
        return Math.max(1, Math.min(size, 48));
    }

    private Double score(String cursor) {
        return cursor == null || cursor.isBlank() ? null : ExploreCursorCodec.decode(cursor).score();
    }

    private java.time.LocalDateTime time(String cursor) {
        return cursor == null || cursor.isBlank() ? null : ExploreCursorCodec.decode(cursor).createdAt();
    }

    private Long id(String cursor) {
        return cursor == null || cursor.isBlank() ? null : ExploreCursorCodec.decode(cursor).id();
    }

    private ExplorePageDto cachedPage(String key, java.util.function.Supplier<ExplorePageDto> supplier) {
        return cacheService.getPage(key).orElseGet(() -> {
            ExplorePageDto value = supplier.get();
            cacheService.putPage(key, value);
            return value;
        });
    }
}
