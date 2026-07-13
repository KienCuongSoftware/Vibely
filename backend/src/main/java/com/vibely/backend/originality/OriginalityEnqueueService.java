package com.vibely.backend.originality;

import com.vibely.backend.video.Video;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OriginalityEnqueueService {

    private final OriginalityJobRepository jobRepository;
    private final OriginalityProperties properties;

    public OriginalityEnqueueService(
        OriginalityJobRepository jobRepository,
        OriginalityProperties properties
    ) {
        this.jobRepository = jobRepository;
        this.properties = properties;
    }

    @Transactional
    public void enqueueAfterVideoPersisted(Video video) {
        if (!properties.isEnabled()) {
            return;
        }
        Optional<OriginalityJobEntity> existing = jobRepository.findByVideo_Id(video.getId());
        if (existing.isPresent()) {
            OriginalityJobEntity job = existing.get();
            job.setJobState(OriginalityJobState.PENDING);
            job.setLastError(null);
            job.setAttempts(0);
            job.setClaimedAt(null);
            job.setPolicyVersion(properties.getPolicyVersion());
            jobRepository.save(job);
            return;
        }
        OriginalityJobEntity job = new OriginalityJobEntity();
        job.setVideo(video);
        job.setJobState(OriginalityJobState.PENDING);
        job.setPolicyVersion(properties.getPolicyVersion());
        jobRepository.save(job);
    }
}
