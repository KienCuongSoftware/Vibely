package com.vibely.backend.video.service;

import com.vibely.backend.discovery.service.VideoDiscoveryIndexer;
import com.vibely.backend.explore.Hashtag;
import com.vibely.backend.explore.HashtagRepository;
import com.vibely.backend.explore.VideoCategory;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.explore.VideoHashtag;
import com.vibely.backend.explore.VideoHashtagRepository;
import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.explore.service.ExploreRankingService;
import com.vibely.backend.video.Video;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class VideoExploreSyncService {

    private final CategoryClassifierService categoryClassifierService;
    private final VideoCategoryRepository videoCategoryRepository;
    private final VideoHashtagRepository videoHashtagRepository;
    private final HashtagRepository hashtagRepository;
    private final ExploreRankingService exploreRankingService;
    private final ExploreCacheService exploreCacheService;
    private final ObjectProvider<VideoDiscoveryIndexer> videoDiscoveryIndexer;

    public VideoExploreSyncService(
        CategoryClassifierService categoryClassifierService,
        VideoCategoryRepository videoCategoryRepository,
        VideoHashtagRepository videoHashtagRepository,
        HashtagRepository hashtagRepository,
        ExploreRankingService exploreRankingService,
        ExploreCacheService exploreCacheService,
        ObjectProvider<VideoDiscoveryIndexer> videoDiscoveryIndexer
    ) {
        this.categoryClassifierService = categoryClassifierService;
        this.videoCategoryRepository = videoCategoryRepository;
        this.videoHashtagRepository = videoHashtagRepository;
        this.hashtagRepository = hashtagRepository;
        this.exploreRankingService = exploreRankingService;
        this.exploreCacheService = exploreCacheService;
        this.videoDiscoveryIndexer = videoDiscoveryIndexer;
    }

    public void syncExploreSignals(Video video) {
        videoCategoryRepository.deleteByVideoId(video.getId());
        videoHashtagRepository.deleteByVideoId(video.getId());
        List<CategoryClassifierService.ScoredCategory> inferred = categoryClassifierService.inferCategories(
            video.getTitle(),
            video.getDescription(),
            video.getAudioTitle()
        );
        for (CategoryClassifierService.ScoredCategory scored : categoryClassifierService.selectCategoriesForPersist(inferred)) {
            videoCategoryRepository.save(new VideoCategory(video, scored.category(), scored.score()));
        }
        List<String> tags = categoryClassifierService.extractHashtags(video.getTitle(), video.getDescription());
        for (String tag : tags) {
            Hashtag hashtag = hashtagRepository.findByTag(tag)
                .orElseGet(() -> hashtagRepository.save(newHashtag(tag)));
            videoHashtagRepository.save(new VideoHashtag(video, hashtag));
        }
        exploreRankingService.recomputeVideo(video);
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:" + video.getPublicId());
        videoDiscoveryIndexer.ifAvailable(indexer -> indexer.indexAfterLegacySync(video.getId()));
    }

    private Hashtag newHashtag(String tag) {
        Hashtag hashtag = new Hashtag();
        hashtag.setTag(tag);
        return hashtag;
    }
}
