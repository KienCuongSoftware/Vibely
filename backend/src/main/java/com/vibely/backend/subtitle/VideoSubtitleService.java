package com.vibely.backend.subtitle;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.translation.MachineTranslationClient;
import com.vibely.backend.translation.TranslateResult;
import com.vibely.backend.translation.TranslationProperties;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.service.VideoPrivacyAccessService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class VideoSubtitleService {

    private static final Logger log = LoggerFactory.getLogger(VideoSubtitleService.class);
    private static final String CUE_SEP = "\n\u241E\n"; // record separator between cues

    private final JdbcTemplate jdbcTemplate;
    private final VideoRepository videoRepository;
    private final VideoPrivacyAccessService privacyAccessService;
    private final UserRepository userRepository;
    private final MachineTranslationClient translationClient;
    private final TranslationProperties translationProperties;
    private final VideoSubtitlePersistService persistService;
    private final ExecutorService syncExecutor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "subtitle-translate-sync");
        t.setDaemon(true);
        return t;
    });

    public VideoSubtitleService(
        JdbcTemplate jdbcTemplate,
        VideoRepository videoRepository,
        VideoPrivacyAccessService privacyAccessService,
        UserRepository userRepository,
        MachineTranslationClient translationClient,
        TranslationProperties translationProperties,
        VideoSubtitlePersistService persistService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.videoRepository = videoRepository;
        this.privacyAccessService = privacyAccessService;
        this.userRepository = userRepository;
        this.translationClient = translationClient;
        this.translationProperties = translationProperties;
        this.persistService = persistService;
    }

    public SubtitleLanguagesResponse listLanguages(UUID publicId) {
        Video video = requireWatchable(publicId);
        persistService.backfillFromContentFeaturesIfNeeded(video.getId());
        List<String> langs = jdbcTemplate.query(
            """
                SELECT lang FROM video_subtitle_tracks
                WHERE video_id = ? AND status = 'READY'
                ORDER BY CASE WHEN source = 'asr' THEN 0 ELSE 1 END, lang
                """,
            (rs, i) -> rs.getString(1),
            video.getId()
        );
        String sourceLang = jdbcTemplate.query(
            """
                SELECT lang FROM video_subtitle_tracks
                WHERE video_id = ? AND source = 'asr' AND status = 'READY'
                ORDER BY updated_at DESC
                LIMIT 1
                """,
            rs -> rs.next() ? rs.getString(1) : null,
            video.getId()
        );
        return new SubtitleLanguagesResponse(langs, sourceLang);
    }

    public SubtitleTrackResponse getOrRequest(UUID publicId, String targetLangRaw, boolean request) {
        String targetLang = SubtitleLangNormalizer.normalize(targetLangRaw);
        if (!StringUtils.hasText(targetLang)) {
            throw new BadRequestException("lang is required");
        }
        Video video = requireWatchable(publicId);
        Long videoId = video.getId();
        persistService.backfillFromContentFeaturesIfNeeded(videoId);

        SubtitleTrackResponse existing = loadReadyTrack(videoId, targetLang);
        if (existing != null) {
            return existing;
        }

        TrackRow asr = findAsrTrack(videoId);
        if (asr == null) {
            return SubtitleTrackResponse.unavailable("No speech captions for this video");
        }

        if (SubtitleLangNormalizer.sameLanguage(asr.lang(), targetLang)) {
            return loadReadyTrack(videoId, asr.lang());
        }

        if (!request) {
            TrackRow pending = findTrack(videoId, targetLang);
            if (pending != null && "PENDING".equals(pending.status())) {
                return SubtitleTrackResponse.pending(targetLang);
            }
            if (pending != null && "FAILED".equals(pending.status())) {
                return SubtitleTrackResponse.failed(targetLang, "Translation failed");
            }
            return SubtitleTrackResponse.unavailable("Captions not available in this language");
        }

        if (!translationProperties.isEnabled()) {
            // Fall back to source-language ASR when translation service is off.
            return loadReadyTrack(videoId, asr.lang());
        }

        ensurePendingTrack(videoId, targetLang, asr.id());
        try {
            Future<SubtitleTrackResponse> future = syncExecutor.submit(
                () -> translateTrackSync(videoId, asr, targetLang)
            );
            return future.get(45, TimeUnit.SECONDS);
        } catch (TimeoutException te) {
            return SubtitleTrackResponse.pending(targetLang);
        } catch (Exception ex) {
            log.warn("Subtitle translate failed videoId={} lang={}: {}", videoId, targetLang, ex.getMessage());
            markFailed(videoId, targetLang, ex.getMessage());
            return SubtitleTrackResponse.failed(targetLang, "Translation failed");
        }
    }

    @Transactional
    protected SubtitleTrackResponse translateTrackSync(Long videoId, TrackRow asr, String targetLang) {
        List<SubtitleCueDto> sourceCues = loadCues(asr.id());
        if (sourceCues.isEmpty()) {
            markFailed(videoId, targetLang, "Empty source cues");
            return SubtitleTrackResponse.failed(targetLang, "Empty source cues");
        }

        StringBuilder joined = new StringBuilder();
        for (int i = 0; i < sourceCues.size(); i++) {
            if (i > 0) {
                joined.append(CUE_SEP);
            }
            joined.append(sourceCues.get(i).text());
        }

        TranslateResult result = translationClient.translate(joined.toString(), asr.lang(), targetLang);
        String translated = result == null ? null : result.translatedText();
        if (!StringUtils.hasText(translated)) {
            markFailed(videoId, targetLang, "Empty translation");
            return SubtitleTrackResponse.failed(targetLang, "Empty translation");
        }

        String[] parts = translated.split(java.util.regex.Pattern.quote(CUE_SEP), -1);
        List<SubtitleCueDto> out = new ArrayList<>(sourceCues.size());
        for (int i = 0; i < sourceCues.size(); i++) {
            SubtitleCueDto src = sourceCues.get(i);
            String text = i < parts.length && StringUtils.hasText(parts[i])
                ? parts[i].trim()
                : src.text();
            out.add(new SubtitleCueDto(src.startMs(), src.endMs(), text));
        }

        Long trackId = upsertTranslatedTrack(videoId, targetLang, asr.id(), result.model(), out);
        return SubtitleTrackResponse.ready(targetLang, "translated", out);
    }

    private Long upsertTranslatedTrack(
        Long videoId,
        String lang,
        Long sourceTrackId,
        String model,
        List<SubtitleCueDto> cues
    ) {
        Long existingId = jdbcTemplate.query(
            """
                SELECT id FROM video_subtitle_tracks
                WHERE video_id = ? AND lang = ?
                LIMIT 1
                """,
            rs -> rs.next() ? rs.getLong(1) : null,
            videoId,
            lang
        );

        long trackId;
        if (existingId != null) {
            trackId = existingId;
            jdbcTemplate.update("DELETE FROM video_subtitle_cues WHERE track_id = ?", trackId);
            jdbcTemplate.update(
                """
                    UPDATE video_subtitle_tracks
                    SET source = 'translated', status = 'READY', source_track_id = ?,
                        model = ?, cue_count = ?, updated_at = NOW()
                    WHERE id = ?
                    """,
                sourceTrackId,
                model,
                cues.size(),
                trackId
            );
        } else {
            trackId = jdbcTemplate.queryForObject(
                """
                    INSERT INTO video_subtitle_tracks
                        (video_id, lang, source, status, source_track_id, model, cue_count, created_at, updated_at)
                    VALUES (?, ?, 'translated', 'READY', ?, ?, ?, NOW(), NOW())
                    RETURNING id
                    """,
                Long.class,
                videoId,
                lang,
                sourceTrackId,
                model,
                cues.size()
            );
        }

        int ordinal = 0;
        for (SubtitleCueDto cue : cues) {
            jdbcTemplate.update(
                """
                    INSERT INTO video_subtitle_cues (track_id, start_ms, end_ms, text, ordinal)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                trackId,
                cue.startMs(),
                cue.endMs(),
                cue.text(),
                ordinal++
            );
        }
        return trackId;
    }

    private void ensurePendingTrack(Long videoId, String lang, Long sourceTrackId) {
        int updated = jdbcTemplate.update(
            """
                INSERT INTO video_subtitle_tracks
                    (video_id, lang, source, status, source_track_id, cue_count, created_at, updated_at)
                VALUES (?, ?, 'translated', 'PENDING', ?, 0, NOW(), NOW())
                ON CONFLICT (video_id, lang) DO UPDATE SET
                    status = CASE
                        WHEN video_subtitle_tracks.status = 'READY' THEN video_subtitle_tracks.status
                        ELSE 'PENDING'
                    END,
                    source_track_id = COALESCE(EXCLUDED.source_track_id, video_subtitle_tracks.source_track_id),
                    updated_at = NOW()
                """,
            videoId,
            lang,
            sourceTrackId
        );
        voidIgnore(updated);
    }

    private void markFailed(Long videoId, String lang, String message) {
        jdbcTemplate.update(
            """
                UPDATE video_subtitle_tracks
                SET status = 'FAILED', updated_at = NOW()
                WHERE video_id = ? AND lang = ?
                """,
            videoId,
            lang
        );
        log.debug("Subtitle track failed videoId={} lang={} msg={}", videoId, lang, message);
    }

    private SubtitleTrackResponse loadReadyTrack(Long videoId, String lang) {
        TrackRow row = jdbcTemplate.query(
            """
                SELECT id, lang, source, status FROM video_subtitle_tracks
                WHERE video_id = ? AND lang = ? AND status = 'READY'
                LIMIT 1
                """,
            rs -> rs.next()
                ? new TrackRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4))
                : null,
            videoId,
            lang
        );
        if (row == null) {
            return null;
        }
        return SubtitleTrackResponse.ready(row.lang(), row.source(), loadCues(row.id()));
    }

    private List<SubtitleCueDto> loadCues(Long trackId) {
        return jdbcTemplate.query(
            """
                SELECT start_ms, end_ms, text FROM video_subtitle_cues
                WHERE track_id = ?
                ORDER BY ordinal, start_ms
                """,
            (rs, i) -> new SubtitleCueDto(rs.getInt(1), rs.getInt(2), rs.getString(3)),
            trackId
        );
    }

    private TrackRow findAsrTrack(Long videoId) {
        return jdbcTemplate.query(
            """
                SELECT id, lang, source, status FROM video_subtitle_tracks
                WHERE video_id = ? AND source = 'asr' AND status = 'READY'
                ORDER BY updated_at DESC
                LIMIT 1
                """,
            rs -> rs.next()
                ? new TrackRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4))
                : null,
            videoId
        );
    }

    private TrackRow findTrack(Long videoId, String lang) {
        return jdbcTemplate.query(
            """
                SELECT id, lang, source, status FROM video_subtitle_tracks
                WHERE video_id = ? AND lang = ?
                LIMIT 1
                """,
            rs -> rs.next()
                ? new TrackRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4))
                : null,
            videoId,
            lang
        );
    }

    private Video requireWatchable(UUID publicId) {
        Video video = videoRepository.findWithAuthorByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Video not found"));
        User viewer = currentUserOrNull();
        if (!privacyAccessService.canViewerWatch(video, viewer)) {
            throw new NotFoundException("Video not found");
        }
        return video;
    }

    private User currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }
        String email = auth.getName();
        if (!StringUtils.hasText(email)) {
            return null;
        }
        return userRepository.findByEmail(email).orElse(null);
    }

    private static void voidIgnore(int ignored) {
        /* jdbc update count unused */
    }

    private record TrackRow(long id, String lang, String source, String status) {}
}
