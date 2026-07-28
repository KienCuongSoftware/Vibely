package com.vibely.backend.admin;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.processing.VideoProcessingEnqueueService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminVideoProcessingService {

    private static final int MAX_BACKFILL = 100;

    private final VideoRepository videoRepository;
    private final VideoProcessingEnqueueService enqueueService;

    public AdminVideoProcessingService(
        VideoRepository videoRepository,
        VideoProcessingEnqueueService enqueueService
    ) {
        this.videoRepository = videoRepository;
        this.enqueueService = enqueueService;
    }

    @Transactional
    public EnqueueResponse reprocess(ReprocessRequest body) {
        if (body == null || body.publicIds() == null || body.publicIds().isEmpty()) {
            throw new BadRequestException("Cần ít nhất một publicId");
        }
        List<String> queued = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        for (String raw : body.publicIds()) {
            UUID id;
            try {
                id = VideoPublicIds.parse(raw);
            } catch (RuntimeException ex) {
                skipped.add(raw + " (id không hợp lệ)");
                continue;
            }
            Video video = videoRepository.findByPublicId(id).orElse(null);
            if (video == null) {
                skipped.add(raw + " (không tìm thấy)");
                continue;
            }
            if (video.getStatus() == VideoStatus.REMOVED) {
                skipped.add(raw + " (đã gỡ)");
                continue;
            }
            queueHlsReprocess(video);
            queued.add(id.toString());
        }
        return new EnqueueResponse(queued.size(), skipped.size(), queued, skipped);
    }

    @Transactional
    public EnqueueResponse backfillReadyHls(BackfillRequest body) {
        int limit = body == null ? 20 : Math.min(MAX_BACKFILL, Math.max(1, body.limit()));
        var page = videoRepository.findByStatusOrderByCreatedAtDesc(
            VideoStatus.READY,
            PageRequest.of(0, limit)
        );
        List<String> queued = new ArrayList<>();
        for (Video video : page.getContent()) {
            queueHlsReprocess(video);
            queued.add(video.getPublicId().toString());
        }
        return new EnqueueResponse(queued.size(), 0, queued, List.of());
    }

    private void queueHlsReprocess(Video video) {
        video.setStatus(VideoStatus.RAW);
        video.setProcessingError(null);
        videoRepository.save(video);
        enqueueService.enqueueAfterVideoPersisted(video);
    }

    public record ReprocessRequest(List<String> publicIds) {}

    public record BackfillRequest(int limit) {}

    public record EnqueueResponse(int queued, int skipped, List<String> queuedIds, List<String> skippedDetails) {}
}
