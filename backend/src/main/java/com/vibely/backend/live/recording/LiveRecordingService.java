package com.vibely.backend.live.recording;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.dto.LiveReplayResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.entity.LiveRecording;
import com.vibely.backend.live.entity.LiveRecordingSegment;
import com.vibely.backend.live.entity.LiveRecordingStatus;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import com.vibely.backend.live.repository.LiveRecordingRepository;
import com.vibely.backend.live.repository.LiveRecordingSegmentRepository;
import com.vibely.backend.live.service.LiveAccessService;
import com.vibely.backend.live.service.LiveActorResolver;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.storage.S3Properties;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPrivacy;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Recording lifecycle hooks (LIVE start/end, SRS on_dvr) and the replay read model. Never throws
 * into the LIVE lifecycle: a recording problem must not prevent starting or ending a LIVE.
 */
@Service
public class LiveRecordingService {

    private static final Logger log = LoggerFactory.getLogger(LiveRecordingService.class);

    private final LiveRecordingRepository recordingRepository;
    private final LiveRecordingSegmentRepository segmentRepository;
    private final LiveMediaSessionRepository sessionRepository;
    private final VideoRepository videoRepository;
    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final MediaUrlPresigner presigner;
    private final S3Properties s3Properties;
    private final LiveProperties properties;
    private final Path dvrRoot;

    public LiveRecordingService(
        LiveRecordingRepository recordingRepository,
        LiveRecordingSegmentRepository segmentRepository,
        LiveMediaSessionRepository sessionRepository,
        VideoRepository videoRepository,
        LiveActorResolver actorResolver,
        LiveAccessService accessService,
        MediaUrlPresigner presigner,
        S3Properties s3Properties,
        LiveProperties properties
    ) {
        this.recordingRepository = recordingRepository;
        this.segmentRepository = segmentRepository;
        this.sessionRepository = sessionRepository;
        this.videoRepository = videoRepository;
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.presigner = presigner;
        this.s3Properties = s3Properties;
        this.properties = properties;
        this.dvrRoot = LiveRecordingFiles.root(properties.getRecording().getDvrDir());
    }

    /** Recording needs SRS media, the DVR toggle and object storage for the replay video. */
    public boolean isAvailable() {
        return properties.getRecording().isEnabled() && properties.getMedia().isEnabled() && s3Properties.isEnabled();
    }

    public void onLiveStarted(Live live) {
        if (!live.isRecordingEnabled() || !isAvailable()) {
            return;
        }
        try {
            if (recordingRepository.findByLiveId(live.getId()).isPresent()) {
                return;
            }
            LocalDateTime startedAt = live.getStartedAt() != null ? live.getStartedAt() : LocalDateTime.now();
            recordingRepository.saveAndFlush(new LiveRecording(live.getId(), live.getHost().getId(), startedAt));
            log.info("live.recording.started live={}", live.getPublicId());
        } catch (DataIntegrityViolationException ex) {
            log.debug("live.recording.already_started live={}", live.getPublicId());
        } catch (RuntimeException ex) {
            log.warn("live.recording.start_failed live={} reason={}", live.getPublicId(), ex.getClass().getSimpleName());
        }
    }

    public void onLiveEnded(Live ended) {
        try {
            LocalDateTime endedAt = ended.getEndedAt() != null ? ended.getEndedAt() : LocalDateTime.now();
            if (recordingRepository.markLiveEnded(ended.getId(), endedAt) > 0) {
                log.info("live.recording.live_ended live={}", ended.getPublicId());
            }
        } catch (RuntimeException ex) {
            // The worker reconciles recordings whose LIVE is already over.
            log.warn("live.recording.end_mark_failed live={} reason={}", ended.getPublicId(), ex.getClass().getSimpleName());
        }
    }

    /**
     * SRS closed a DVR file. The file is attached to the LIVE's recording while it is recording;
     * otherwise (LIVE without recording, unknown stream, too late) it is deleted so the disk cannot
     * fill up. Idempotent per file path.
     */
    public void onDvr(String streamName, String cwd, String file) {
        Optional<Path> resolved = LiveRecordingFiles.resolve(dvrRoot, cwd, file);
        if (resolved.isEmpty()) {
            log.warn("live.recording.dvr_rejected stream={} reason=invalid_path", streamName);
            return;
        }
        Path path = resolved.get();
        Optional<LiveRecording> recording = StringUtils.hasText(streamName)
            ? sessionRepository.findByStreamName(streamName).map(LiveMediaSession::getLiveId).flatMap(recordingRepository::findByLiveId)
            : Optional.empty();
        if (recording.isEmpty() || recording.get().getStatus() != LiveRecordingStatus.RECORDING) {
            LiveRecordingFiles.deleteQuietly(dvrRoot, path);
            log.info("live.recording.dvr_discarded stream={} reason={}", streamName,
                recording.isEmpty() ? "not_recorded" : "recording_closed");
            return;
        }
        String normalized = path.toString();
        if (segmentRepository.existsByFilePath(normalized)) {
            return;
        }
        try {
            segmentRepository.saveAndFlush(new LiveRecordingSegment(
                recording.get().getId(),
                normalized,
                LiveRecordingFiles.sizeOf(path),
                LocalDateTime.now()
            ));
            log.info("live.recording.segment_added recording={} file={}", recording.get().getId(), path.getFileName());
        } catch (DataIntegrityViolationException ex) {
            log.debug("live.recording.segment_duplicate file={}", path.getFileName());
        }
    }

    /**
     * The host sees every state (processing, failed, the draft replay). Other viewers only get a
     * replay the host has published publicly; anything else is reported as not found.
     */
    public LiveReplayResponse replay(Authentication authentication, String liveId) {
        User viewer = actorResolver.optional(authentication).orElse(null);
        Live live = accessService.requireViewable(liveId, viewer);
        boolean owner = live.isHostedBy(viewer);
        LiveRecording recording = recordingRepository.findByLiveId(live.getId())
            .orElseThrow(() -> new LiveException(LiveErrorCode.REPLAY_NOT_FOUND));
        Video video = recording.getVideoId() == null ? null : videoRepository.findById(recording.getVideoId()).orElse(null);
        LiveRecordingStatus status = effectiveStatus(recording, video);
        boolean published = video != null && isPublished(video);
        if (!owner && !(status == LiveRecordingStatus.READY && published)) {
            throw new LiveException(LiveErrorCode.REPLAY_NOT_FOUND);
        }

        String playbackUrl = null;
        String thumbnailUrl = null;
        Instant expiresAt = null;
        if (status == LiveRecordingStatus.READY && video != null) {
            String source = StringUtils.hasText(video.getMasterPlaylistUrl()) ? video.getMasterPlaylistUrl() : video.getVideoUrl();
            playbackUrl = presigner.presignPlaybackUrl(source);
            thumbnailUrl = presigner.presignPlaybackUrl(video.getThumbnailUrl());
            if (playbackUrl != null && !playbackUrl.equals(source)) {
                expiresAt = Instant.now().plusSeconds(3600L * Math.min(Math.max(s3Properties.getPlaybackPresignExpiryHours(), 1), 168));
            }
        }
        return new LiveReplayResponse(
            live.getPublicId(),
            live.getTitle(),
            status.name(),
            owner,
            published,
            video != null && status != LiveRecordingStatus.DELETED ? video.getPublicId() : null,
            live.getHost().getUsername(),
            playbackUrl,
            thumbnailUrl,
            recording.getDurationSeconds(),
            expiresAt,
            live.getStartedAt(),
            live.getEndedAt(),
            owner ? recording.getFailureReason() : null
        );
    }

    /** A replay whose video was removed reads as DELETED even before the worker records it. */
    static LiveRecordingStatus effectiveStatus(LiveRecording recording, Video video) {
        if ((recording.getStatus() == LiveRecordingStatus.READY || recording.getStatus() == LiveRecordingStatus.PROCESSING)
            && recording.getVideoId() != null && video == null) {
            return LiveRecordingStatus.DELETED;
        }
        if (recording.getStatus() == LiveRecordingStatus.READY && recording.getVideoId() == null) {
            return LiveRecordingStatus.DELETED;
        }
        return recording.getStatus();
    }

    static boolean isPublished(Video video) {
        boolean scheduledLater = video.getScheduledAt() != null && video.getScheduledAt().isAfter(Instant.now());
        return !video.isStudioDraft()
            && !scheduledLater
            && video.getPrivacy() == VideoPrivacy.PUBLIC
            && video.getStatus() == VideoStatus.READY;
    }
}
