package com.vibely.backend.enhancement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.enhancement", name = "enabled", havingValue = "true", matchIfMissing = true)
public class EnhancementRuleEvaluatorScheduler {

    private static final Logger log = LoggerFactory.getLogger(EnhancementRuleEvaluatorScheduler.class);

    private final EnhancementProperties properties;
    private final EnhancementRuleRepository ruleRepository;
    private final VideoRepository videoRepository;
    private final VideoViewRepository videoViewRepository;
    private final EnhancementEnqueueService enqueueService;
    private final EnhancementJobRepository jobRepository;
    private final ObjectMapper objectMapper;

    public EnhancementRuleEvaluatorScheduler(
        EnhancementProperties properties,
        EnhancementRuleRepository ruleRepository,
        VideoRepository videoRepository,
        VideoViewRepository videoViewRepository,
        EnhancementEnqueueService enqueueService,
        EnhancementJobRepository jobRepository,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.ruleRepository = ruleRepository;
        this.videoRepository = videoRepository;
        this.videoViewRepository = videoViewRepository;
        this.enqueueService = enqueueService;
        this.jobRepository = jobRepository;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${app.enhancement.rule-eval-interval-ms:120000}", initialDelayString = "45000")
    public void evaluate() {
        if (!properties.isRuleEvalEnabled()) {
            return;
        }
        List<EnhancementRuleEntity> rules = ruleRepository.findByEnabledTrueOrderByPriorityAsc();
        if (rules.isEmpty()) {
            return;
        }
        // Scan recent READY public videos (bounded).
        List<Video> videos = videoRepository
            .findByStatusOrderByCreatedAtDesc(VideoStatus.READY, PageRequest.of(0, 50))
            .getContent();
        for (Video video : videos) {
            long views = videoViewRepository.countByVideo_Id(video.getId());
            for (EnhancementRuleEntity rule : rules) {
                try {
                    if (!matches(rule, views)) {
                        continue;
                    }
                    if (inCooldown(video.getId(), rule)) {
                        continue;
                    }
                    Action action = parseAction(rule.getActionJson());
                    for (String profile : action.profiles) {
                        enqueueService.enqueueManual(
                            video.getId(),
                            profile,
                            action.level,
                            "RULE:" + rule.getName()
                        );
                    }
                    log.info(
                        "Rule matched videoId={} rule={} views={}",
                        video.getId(),
                        rule.getName(),
                        views
                    );
                    break;
                } catch (Exception ex) {
                    log.debug(
                        "Rule eval skip videoId={} rule={}: {}",
                        video.getId(),
                        rule.getName(),
                        ex.getMessage()
                    );
                }
            }
        }
    }

    private boolean inCooldown(Long videoId, EnhancementRuleEntity rule) {
        Instant since = Instant.now().minus(Math.max(1, rule.getCooldownHours()), ChronoUnit.HOURS);
        return jobRepository
            .findByVideo_IdOrderByCreatedAtDesc(videoId)
            .stream()
            .anyMatch(j -> j.getCreatedAt() != null && j.getCreatedAt().isAfter(since));
    }

    private boolean matches(EnhancementRuleEntity rule, long views) throws Exception {
        JsonNode root = objectMapper.readTree(rule.getPredicateJson());
        JsonNode all = root.path("all");
        if (!all.isArray()) {
            return false;
        }
        for (JsonNode pred : all) {
            String metric = pred.path("metric").asText();
            String op = pred.path("op").asText();
            long value = pred.path("value").asLong();
            if ("views".equalsIgnoreCase(metric)) {
                if (">=".equals(op) && views < value) {
                    return false;
                }
                if (">".equals(op) && views <= value) {
                    return false;
                }
            }
        }
        return true;
    }

    private Action parseAction(String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        String level = root.path("level").asText(properties.getDefaultLevel());
        List<String> profiles = new ArrayList<>();
        JsonNode arr = root.path("enqueue_profiles");
        if (arr.isArray()) {
            arr.forEach(n -> profiles.add(n.asText()));
        }
        if (profiles.isEmpty()) {
            profiles.add("ENHANCE_NATIVE");
        }
        return new Action(profiles, level);
    }

    private record Action(List<String> profiles, String level) {}
}
