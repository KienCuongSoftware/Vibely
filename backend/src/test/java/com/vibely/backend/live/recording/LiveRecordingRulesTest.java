package com.vibely.backend.live.recording;

import com.vibely.backend.live.entity.LiveAnalytics;
import com.vibely.backend.live.entity.LiveRecording;
import com.vibely.backend.live.entity.LiveRecordingStatus;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPrivacy;
import com.vibely.backend.video.VideoStatus;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class LiveRecordingRulesTest {

    @TempDir
    Path temp;

    // --- DVR paths are untrusted hook input ----------------------------------------------------

    @Test
    void onlyRegularFlvFilesInsideTheDvrDirectoryResolve() throws Exception {
        Path root = LiveRecordingFiles.root(temp.resolve("dvr").toString());
        Files.createDirectories(root.resolve("live"));
        Path inside = Files.writeString(root.resolve("s0123.1700000000000.flv"), "x");
        Path nested = Files.writeString(root.resolve("live/s0123.1700000000001.flv"), "x");
        Path wrongExt = Files.writeString(root.resolve("s0123.txt"), "x");
        Path outside = Files.writeString(temp.resolve("outside.flv"), "x");

        assertThat(LiveRecordingFiles.resolve(root, null, inside.toString())).contains(inside);
        assertThat(LiveRecordingFiles.resolve(root, root.toString(), "live/s0123.1700000000001.flv")).contains(nested);
        assertThat(LiveRecordingFiles.resolve(root, null, wrongExt.toString())).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, null, outside.toString())).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, root.toString(), "../outside.flv")).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, null, root.resolve("live/../../outside.flv").toString())).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, null, root.resolve("missing.flv").toString())).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, null, "relative.flv")).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, null, root.toString())).isEmpty();
        assertThat(LiveRecordingFiles.resolve(root, null, "")).isEmpty();
    }

    @Test
    void deleteRefusesFilesOutsideTheDvrDirectory() throws Exception {
        Path root = LiveRecordingFiles.root(temp.resolve("dvr").toString());
        Files.createDirectories(root);
        Path inside = Files.writeString(root.resolve("a.flv"), "x");
        Path outside = Files.writeString(temp.resolve("keep.flv"), "x");

        LiveRecordingFiles.deleteQuietly(root, outside);
        LiveRecordingFiles.deleteQuietly(root, root.resolve("../keep.flv").toString());
        LiveRecordingFiles.deleteQuietly(root, inside.toString());

        assertThat(outside).exists();
        assertThat(inside).doesNotExist();
    }

    // --- replay visibility --------------------------------------------------------------------

    @Test
    void onlyPublicReadyNonDraftVideosArePublished() {
        assertThat(LiveRecordingService.isPublished(video(false, VideoPrivacy.PUBLIC, VideoStatus.READY, null))).isTrue();
        assertThat(LiveRecordingService.isPublished(video(true, VideoPrivacy.PUBLIC, VideoStatus.READY, null))).isFalse();
        assertThat(LiveRecordingService.isPublished(video(false, VideoPrivacy.PRIVATE, VideoStatus.READY, null))).isFalse();
        assertThat(LiveRecordingService.isPublished(video(false, VideoPrivacy.FRIENDS, VideoStatus.READY, null))).isFalse();
        assertThat(LiveRecordingService.isPublished(video(false, VideoPrivacy.PUBLIC, VideoStatus.PROCESSING, null))).isFalse();
        assertThat(LiveRecordingService.isPublished(video(false, VideoPrivacy.PUBLIC, VideoStatus.HIDDEN, null))).isFalse();
        assertThat(LiveRecordingService.isPublished(
            video(false, VideoPrivacy.PUBLIC, VideoStatus.READY, Instant.now().plusSeconds(3600)))).isFalse();
        assertThat(LiveRecordingService.isPublished(
            video(false, VideoPrivacy.PUBLIC, VideoStatus.READY, Instant.now().minusSeconds(60)))).isTrue();
    }

    @Test
    void replayWhoseVideoWasRemovedReadsAsDeleted() {
        LiveRecording ready = recording(LiveRecordingStatus.READY, 9L);
        assertThat(LiveRecordingService.effectiveStatus(ready, null)).isEqualTo(LiveRecordingStatus.DELETED);
        assertThat(LiveRecordingService.effectiveStatus(ready, new Video())).isEqualTo(LiveRecordingStatus.READY);
        assertThat(LiveRecordingService.effectiveStatus(recording(LiveRecordingStatus.READY, null), null))
            .isEqualTo(LiveRecordingStatus.DELETED);
        assertThat(LiveRecordingService.effectiveStatus(recording(LiveRecordingStatus.PROCESSING, null), null))
            .isEqualTo(LiveRecordingStatus.PROCESSING);
        assertThat(LiveRecordingService.effectiveStatus(recording(LiveRecordingStatus.FAILED, null), null))
            .isEqualTo(LiveRecordingStatus.FAILED);
    }

    // --- analytics ----------------------------------------------------------------------------

    @Test
    void analyticsAveragesAreDerivedWithoutDividingByZero() {
        LiveAnalytics busy = new LiveAnalytics(1L, 600, 4, 1200, 3, 10, 5, 1, "host", LocalDateTime.now());
        assertThat(busy.getAverageWatchSeconds()).isEqualTo(300);
        assertThat(busy.getAverageViewers()).isEqualTo(2.0);

        LiveAnalytics empty = new LiveAnalytics(2L, 0, 0, 0, 0, 0, 0, 0, null, LocalDateTime.now());
        assertThat(empty.getAverageWatchSeconds()).isZero();
        assertThat(empty.getAverageViewers()).isZero();
    }

    @Test
    void replayIsCappedBelowThePipelineDurationLimit() {
        assertThat(LiveRecordingProcessor.PIPELINE_SAFE_MAX_SECONDS).isLessThan(3600);
    }

    private static Video video(boolean draft, VideoPrivacy privacy, VideoStatus status, Instant scheduledAt) {
        Video video = new Video();
        video.setStudioDraft(draft);
        video.setPrivacy(privacy);
        video.setStatus(status);
        video.setScheduledAt(scheduledAt);
        return video;
    }

    private static LiveRecording recording(LiveRecordingStatus status, Long videoId) {
        LiveRecording recording = new LiveRecording(1L, 2L, LocalDateTime.now());
        ReflectionTestUtils.setField(recording, "status", status);
        ReflectionTestUtils.setField(recording, "videoId", videoId);
        return recording;
    }
}
