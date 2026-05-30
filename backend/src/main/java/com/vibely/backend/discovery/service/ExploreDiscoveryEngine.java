package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.repository.DiscoveryExploreQueryRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExploreDiscoveryEngine {
    private final DiscoveryProperties properties;
    private final DiscoveryExploreQueryRepository discoveryExploreQueryRepository;

    public ExploreDiscoveryEngine(
        DiscoveryProperties properties,
        DiscoveryExploreQueryRepository discoveryExploreQueryRepository
    ) {
        this.properties = properties;
        this.discoveryExploreQueryRepository = discoveryExploreQueryRepository;
    }

    public boolean isHybridEnabled() {
        return properties.isEnabled() && properties.isHybridExplore();
    }

    @Transactional(readOnly = true)
    public List<ExploreVideoProjection> trending(Double cursorScore, LocalDateTime cursorTime, Long cursorId, Pageable pageable) {
        return discoveryExploreQueryRepository.findTrendingHybrid(cursorScore, cursorTime, cursorId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ExploreVideoProjection> category(
        String slug,
        Double cursorScore,
        LocalDateTime cursorTime,
        Long cursorId,
        Pageable pageable
    ) {
        return discoveryExploreQueryRepository.findByCategorySlugHybrid(slug, cursorScore, cursorTime, cursorId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ExploreVideoProjection> search(
        String q,
        Double cursorScore,
        LocalDateTime cursorTime,
        Long cursorId,
        Pageable pageable
    ) {
        if (!properties.isHybridSearch()) {
            return List.of();
        }
        return discoveryExploreQueryRepository.searchHybrid(q, cursorScore, cursorTime, cursorId, pageable);
    }
}
