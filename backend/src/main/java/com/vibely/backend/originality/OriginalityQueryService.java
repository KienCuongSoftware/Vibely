package com.vibely.backend.originality;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.service.VideoQueryService;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OriginalityQueryService {

    private final OriginalityJobRepository jobRepository;
    private final OriginalityReportRepository reportRepository;
    private final VideoQueryService videoQueryService;
    private final UserRepository userRepository;

    public OriginalityQueryService(
        OriginalityJobRepository jobRepository,
        OriginalityReportRepository reportRepository,
        VideoQueryService videoQueryService,
        UserRepository userRepository
    ) {
        this.jobRepository = jobRepository;
        this.reportRepository = reportRepository;
        this.videoQueryService = videoQueryService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public OriginalityReportResponse getForAuthor(UUID publicId, String authorEmail) {
        Video video = videoQueryService.getVideoByPublicIdOrThrow(publicId);
        User author = userRepository
            .findByEmail(authorEmail)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        if (!Objects.equals(video.getAuthor().getId(), author.getId())) {
            throw new NotFoundException("Không tìm thấy video");
        }
        Optional<OriginalityJobEntity> job = jobRepository.findByVideo_Id(video.getId());
        Optional<OriginalityReportEntity> report = reportRepository.findDetailedByVideoId(video.getId());
        String jobState = job.map(j -> j.getJobState().name()).orElse("MISSING");
        String lastError = job.map(OriginalityJobEntity::getLastError).orElse(null);
        if (report.isEmpty()) {
            return new OriginalityReportResponse(
                video.getId(),
                video.getPublicId(),
                jobState,
                job.map(OriginalityJobEntity::getPolicyVersion).orElse(null),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                lastError
            );
        }
        OriginalityReportEntity r = report.get();
        UUID matchedPublicId = r.getMatchedVideo() == null ? null : r.getMatchedVideo().getPublicId();
        return new OriginalityReportResponse(
            video.getId(),
            video.getPublicId(),
            jobState,
            r.getPolicyVersion(),
            r.getOriginalityScore(),
            r.getVisualSimilarity(),
            r.getAudioSimilarity(),
            r.getOcrSimilarity(),
            r.getWatermarkScore(),
            r.getMetadataScore(),
            r.getSceneObjectScore(),
            r.getOverallConfidence(),
            r.getRiskLevel().name(),
            r.getDecision().name(),
            matchedPublicId,
            r.getExplainJson(),
            r.getModelVersions(),
            lastError
        );
    }
}
