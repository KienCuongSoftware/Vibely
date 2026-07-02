package com.vibely.backend.explore.service;

import com.vibely.backend.discovery.service.ExploreDiscoveryEngine;
import com.vibely.backend.discovery.service.RecommendationService;
import com.vibely.backend.discovery.service.RelatedVideoDiscoveryService;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.ExploreCursorCodec;
import com.vibely.backend.explore.ExploreQueryRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.explore.dto.ExploreCategoryDto;
import com.vibely.backend.explore.dto.ExplorePageDto;
import com.vibely.backend.explore.dto.ExploreTabDto;
import com.vibely.backend.explore.dto.ExploreVideoCardDto;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoBookmarkRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.storage.MediaUrlPresigner;
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
    private final ExploreDiscoveryEngine exploreDiscoveryEngine;
    private final RelatedVideoDiscoveryService relatedVideoDiscoveryService;
    private final PersonalizedExploreTabsService personalizedExploreTabsService;
    private final RecommendationService recommendationService;
    private final MediaUrlPresigner mediaUrlPresigner;

    public ExploreService(
        ExploreQueryRepository exploreQueryRepository,
        CategoryRepository categoryRepository,
        VideoCategoryRepository videoCategoryRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoBookmarkRepository bookmarkRepository,
        VideoViewRepository viewRepository,
        ExploreCacheService cacheService,
        ExploreDiscoveryEngine exploreDiscoveryEngine,
        RelatedVideoDiscoveryService relatedVideoDiscoveryService,
        PersonalizedExploreTabsService personalizedExploreTabsService,
        RecommendationService recommendationService,
        MediaUrlPresigner mediaUrlPresigner
    ) {
        this.exploreQueryRepository = exploreQueryRepository;
        this.categoryRepository = categoryRepository;
        this.videoCategoryRepository = videoCategoryRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.viewRepository = viewRepository;
        this.cacheService = cacheService;
        this.exploreDiscoveryEngine = exploreDiscoveryEngine;
        this.relatedVideoDiscoveryService = relatedVideoDiscoveryService;
        this.personalizedExploreTabsService = personalizedExploreTabsService;
        this.recommendationService = recommendationService;
        this.mediaUrlPresigner = mediaUrlPresigner;
    }

    @Transactional(readOnly = true)
    public List<ExploreTabDto> tabs(String viewerEmail) {
        return personalizedExploreTabsService.tabs(viewerEmail);
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
            exploreDiscoveryEngine.isHybridEnabled()
                ? exploreDiscoveryEngine.trending(score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1))
                : exploreQueryRepository.findTrending(score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1)),
            capSize(size)
        ));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto category(String slug, String cursor, int size) {
        String normalized = String.valueOf(slug == null ? "" : slug).trim().toLowerCase();
        return cachedPage("category:" + normalized + ":" + (cursor == null ? "first" : cursor), () -> toPage(
            exploreDiscoveryEngine.isHybridEnabled()
                ? exploreDiscoveryEngine.category(normalized, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1))
                : exploreQueryRepository.findByCategorySlug(normalized, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1)),
            capSize(size)
        ));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto topic(String slug, String cursor, int size) {
        String normalized = String.valueOf(slug == null ? "" : slug).trim().toLowerCase();
        return cachedPage("topic:" + normalized + ":" + (cursor == null ? "first" : cursor), () -> toPage(
            exploreDiscoveryEngine.isHybridEnabled()
                ? exploreDiscoveryEngine.topic(normalized, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1))
                : List.of(),
            capSize(size)
        ));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto forYou(String viewerEmail, String cursor, int size) {
        int capped = capSize(size);
        String viewerKey = viewerEmail == null || viewerEmail.isBlank() ? "anon" : viewerEmail.trim().toLowerCase();
        return cachedPage("for-you:" + viewerKey + ":" + (cursor == null ? "first" : cursor), () -> {
            Long userId = personalizedExploreTabsService.resolveUserId(viewerEmail);
            if (userId == null) {
                return trending(cursor, capped);
            }
            List<ExploreVideoProjection> rows = recommendationService.forYouFeed(userId, capped + 1);
            return toPage(rows, capped);
        });
    }

    @Transactional(readOnly = true)
    public ExplorePageDto search(String q, String cursor, int size) {
        String query = String.valueOf(q == null ? "" : q).trim();
        return presignExplorePage(toPage(
            exploreDiscoveryEngine.isHybridEnabled()
                ? exploreDiscoveryEngine.search(query, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1))
                : exploreQueryRepository.search(query, score(cursor), time(cursor), id(cursor), PageRequest.of(0, capSize(size) + 1)),
            capSize(size)
        ));
    }

    @Transactional(readOnly = true)
    public ExplorePageDto related(String publicId, int size) {
        return cachedPage("related:" + publicId, () -> {
            var hybrid = relatedVideoDiscoveryService.related(java.util.UUID.fromString(publicId), capSize(size) + 1);
            if (!hybrid.isEmpty()) {
                return toPage(hybrid, capSize(size));
            }
            return toPage(
                exploreQueryRepository.related(java.util.UUID.fromString(publicId), PageRequest.of(0, capSize(size) + 1)),
                capSize(size)
            );
        });
    }

    private ExplorePageDto toPage(List<ExploreVideoProjection> rows, int size) {
        boolean hasNext = rows.size() > size;
        List<ExploreVideoProjection> data = rows.stream().limit(size).toList();
        List<Long> videoIds = ids(data);
        Map<Long, Long> likes = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(likeRepository.countGroupedByVideoIds(videoIds));
        Map<Long, Long> comments = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(commentRepository.countGroupedByVideoIds(videoIds));
        Map<Long, Long> bookmarks = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(bookmarkRepository.countGroupedByVideoIds(videoIds));
        Map<Long, Long> views = videoIds.isEmpty() ? Collections.emptyMap() : groupCount(viewRepository.countGroupedByVideoIds(videoIds));
        List<ExploreVideoCardDto> cards = data.stream()
            .map(v -> toCard(v, likes, comments, bookmarks, views))
            .toList();
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

    private ExploreVideoCardDto toCard(
        ExploreVideoProjection v,
        Map<Long, Long> likes,
        Map<Long, Long> comments,
        Map<Long, Long> bookmarks,
        Map<Long, Long> views
    ) {
        return new ExploreVideoCardDto(
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
        );
    }

    private ExplorePageDto cachedPage(String key, java.util.function.Supplier<ExplorePageDto> supplier) {
        ExplorePageDto page = cacheService.getPage(key).orElseGet(() -> {
            ExplorePageDto value = supplier.get();
            cacheService.putPage(key, value);
            return value;
        });
        return presignExplorePage(page);
    }

    private ExplorePageDto presignExplorePage(ExplorePageDto page) {
        if (page == null || page.items() == null || page.items().isEmpty()) {
            return page;
        }
        List<ExploreVideoCardDto> items = page.items().stream()
            .map(item -> new ExploreVideoCardDto(
                item.publicId(),
                item.authorId(),
                item.authorUsername(),
                item.authorDisplayName(),
                mediaUrlPresigner.presignPlaybackUrl(item.authorAvatarUrl()),
                item.title(),
                item.description(),
                mediaUrlPresigner.presignPlaybackUrl(item.videoUrl()),
                mediaUrlPresigner.presignPlaybackUrl(item.thumbnailUrl()),
                mediaUrlPresigner.presignPlaybackUrl(item.masterPlaylistUrl()),
                item.likeCount(),
                item.commentCount(),
                item.bookmarkCount(),
                item.shareCount(),
                item.viewCount(),
                item.createdAt(),
                item.exploreScore()
            ))
            .toList();
        return new ExplorePageDto(items, page.nextCursor(), page.hasNext());
    }
}
