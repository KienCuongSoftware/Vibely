package com.vibely.backend.processing;

import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Polls the {@code video_processing_jobs} table and runs the FFmpeg pipeline. Disable on API-only nodes;
 * enable on dedicated worker instances with FFmpeg installed and {@code app.s3.enabled=true}.
 */
@Component
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "app.processing.worker", name = "enabled", havingValue = "true")
public class VideoProcessingJobWorker {

    private static final Logger log = LoggerFactory.getLogger(VideoProcessingJobWorker.class);

    private final VideoProcessingJobPickerService pickerService;
    private final FfmpegHlsPipelineRunner pipelineRunner;

    public VideoProcessingJobWorker(
        VideoProcessingJobPickerService pickerService,
        FfmpegHlsPipelineRunner pipelineRunner
    ) {
        this.pickerService = pickerService;
        this.pipelineRunner = pipelineRunner;
        log.info("VideoProcessingJobWorker started (FFmpeg HLS pipeline polling enabled)");
    }

    @Scheduled(fixedDelayString = "${app.processing.poll-interval-ms:5000}", initialDelayString = "15000")
    public void poll() {
        Optional<VideoPipelineWorkItem> item = pickerService.pollNextPending();
        if (item.isPresent()) {
            VideoPipelineWorkItem work = item.get();
            log.info("Claimed video processing job jobId={} videoId={}", work.jobId(), work.videoId());
            pipelineRunner.run(work);
        }
    }
}
