package com.vibely.backend.explore.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.model.UserTopicInterest;
import com.vibely.backend.discovery.repository.UserTopicInterestRepository;
import com.vibely.backend.discovery.service.TopicTabGrouper;
import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.explore.dto.ExploreTabDto;
import com.vibely.backend.user.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PersonalizedExploreTabsService {
    public static final String FOR_YOU_SLUG = "for-you";
    public static final String FOR_YOU_NAME = "Dành cho bạn";

    private final DiscoveryProperties discoveryProperties;
    private final UserRepository userRepository;
    private final UserTopicInterestRepository userTopicInterestRepository;
    private final CategoryRepository categoryRepository;
    private final VideoCategoryRepository videoCategoryRepository;
    private final TopicTabGrouper topicTabGrouper;

    public PersonalizedExploreTabsService(
        DiscoveryProperties discoveryProperties,
        UserRepository userRepository,
        UserTopicInterestRepository userTopicInterestRepository,
        CategoryRepository categoryRepository,
        VideoCategoryRepository videoCategoryRepository,
        TopicTabGrouper topicTabGrouper
    ) {
        this.discoveryProperties = discoveryProperties;
        this.userRepository = userRepository;
        this.userTopicInterestRepository = userTopicInterestRepository;
        this.categoryRepository = categoryRepository;
        this.videoCategoryRepository = videoCategoryRepository;
        this.topicTabGrouper = topicTabGrouper;
    }

    @Transactional(readOnly = true)
    public List<ExploreTabDto> tabs(String viewerEmail) {
        Long userId = resolveUserId(viewerEmail);
        List<ExploreTabDto> tabs = new ArrayList<>();
        Set<String> usedSlugs = new HashSet<>();

        if (userId != null && discoveryProperties.isEnabled()) {
            List<UserTopicInterest> interests = userTopicInterestRepository.findTopByUserId(
                userId,
                PageRequest.of(0, 12)
            );
            List<UserTopicInterest> strong = interests.stream()
                .filter(i -> i.getScore() >= 0.35)
                .toList();
            if (!strong.isEmpty()) {
                tabs.add(new ExploreTabDto(
                    FOR_YOU_SLUG,
                    FOR_YOU_NAME,
                    "for_you",
                    true,
                    null,
                    0
                ));
                usedSlugs.add(FOR_YOU_SLUG);
            }
            List<TopicTabGrouper.GroupedInterest> grouped = topicTabGrouper.groupInterests(strong).values().stream()
                .sorted(Comparator.comparingDouble(TopicTabGrouper.GroupedInterest::aggregatedScore).reversed())
                .limit(3)
                .toList();
            for (TopicTabGrouper.GroupedInterest group : grouped) {
                if (group.slug() == null || group.slug().isBlank() || !usedSlugs.add(group.slug())) {
                    continue;
                }
                tabs.add(new ExploreTabDto(
                    group.slug(),
                    group.displayName(),
                    "topic",
                    true,
                    group.representativeTopicId(),
                    0
                ));
            }
        }

        for (Category category : categoryRepository.findByEnabledTrueOrderByNameAsc()) {
            String slug = category.getSlug();
            if (slug == null || slug.isBlank() || !usedSlugs.add(slug)) {
                continue;
            }
            tabs.add(new ExploreTabDto(
                slug,
                category.getName(),
                "category",
                false,
                null,
                videoCategoryRepository.countByCategoryId(category.getId())
            ));
        }
        return tabs;
    }

    public Long resolveUserId(String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(viewerEmail.trim())
            .map(com.vibely.backend.user.User::getId)
            .orElse(null);
    }
}
