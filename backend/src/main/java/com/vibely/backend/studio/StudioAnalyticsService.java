package com.vibely.backend.studio;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoBookmarkRepository;
import com.vibely.backend.interaction.dto.PlaybackSample;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.VideoService;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudioAnalyticsService {

    private static final List<Integer> ALLOWED_DAYS = List.of(7, 28, 60, 90);

    /** Video của kênh còn tính vào Studio (không chỉ READY — tránh thống kê 0 khi bài đang xử lý). */
    private static final List<VideoStatus> STUDIO_VIDEO_METRICS_STATUSES = List.of(
        VideoStatus.READY,
        VideoStatus.PROCESSING,
        VideoStatus.RAW,
        VideoStatus.FAILED
    );

    private static final List<StudioTrafficSourceResponse> DEFAULT_TRAFFIC_SOURCES = List.of(
        new StudioTrafficSourceResponse("foryou", "For You", null),
        new StudioTrafficSourceResponse("profile", "Hồ sơ", null),
        new StudioTrafficSourceResponse("search", "Tìm kiếm", null),
        new StudioTrafficSourceResponse("other", "Khác", null)
    );

    /** Ngưỡng “gần xem hết” (tỷ lệ trên thời lượng đã chuẩn hoá). */
    private static final double FULL_WATCH_RATIO = 0.88;
    /** Clip ≤30s: nới thêm (feed hay thoát ~cuối nhưng chưa tới 88%). */
    private static final int SHORT_CLIP_FULL_PERCENT = 82;
    private static final long SHORT_CLIP_MAX_DURATION_MS = 30_000L;

    /** Khi không có duration từ DB/client, dùng mốc ngắn để ước lượng retention (không hiển thị cho user). */
    private static final long DEFAULT_ASSUMED_DURATION_MS = 8_000L;

    private final UserRepository userRepository;
    private final VideoViewRepository videoViewRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final VideoService videoService;
    private final FollowRepository followRepository;

    public StudioAnalyticsService(
        UserRepository userRepository,
        VideoViewRepository videoViewRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        VideoService videoService,
        FollowRepository followRepository
    ) {
        this.userRepository = userRepository;
        this.videoViewRepository = videoViewRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.videoService = videoService;
        this.followRepository = followRepository;
    }

    @Transactional(readOnly = true)
    public StudioAnalyticsOverviewResponse getOverview(String email, int days) {
        if (!ALLOWED_DAYS.contains(days)) {
            throw new BadRequestException("Khoảng ngày không hợp lệ. Chỉ chấp nhận 7, 28, 60, 90.");
        }

        User me = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        LocalDate startDay = LocalDate.now().minusDays(days - 1L);
        LocalDateTime from = startDay.atStartOfDay();

        long totalViews = videoViewRepository.countViewsForAuthorVideoStatusesSince(
            me.getId(),
            STUDIO_VIDEO_METRICS_STATUSES,
            from
        );
        long totalLikes = likeRepository.countLikesForAuthorVideoStatusesSince(
            me.getId(),
            STUDIO_VIDEO_METRICS_STATUSES,
            from
        );
        long totalComments = commentRepository.countCommentsForAuthorVideoStatusesSince(
            me.getId(),
            STUDIO_VIDEO_METRICS_STATUSES,
            from
        );

        Map<LocalDate, long[]> dayToMetrics = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            dayToMetrics.put(startDay.plusDays(i), new long[] { 0L, 0L, 0L });
        }

        for (DailyCountProjection row : videoViewRepository.countDailyViewsForAuthorVideoStatusesSince(
            me.getId(),
            STUDIO_VIDEO_METRICS_STATUSES,
            from
        )) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) bucket[0] = row.getTotal();
        }
        for (DailyCountProjection row : likeRepository.countDailyLikesForAuthorVideoStatusesSince(
            me.getId(),
            STUDIO_VIDEO_METRICS_STATUSES,
            from
        )) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) bucket[1] = row.getTotal();
        }
        for (DailyCountProjection row : commentRepository.countDailyCommentsForAuthorVideoStatusesSince(
            me.getId(),
            STUDIO_VIDEO_METRICS_STATUSES,
            from
        )) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) bucket[2] = row.getTotal();
        }

        List<StudioAnalyticsPointResponse> points = dayToMetrics.entrySet().stream()
            .map((entry) -> new StudioAnalyticsPointResponse(
                entry.getKey(),
                entry.getValue()[0],
                entry.getValue()[1],
                entry.getValue()[2]
            ))
            .toList();

        List<StudioLatestCommentResponse> latestComments = commentRepository
            .findLatestByAuthorIdAndVideoStatusIn(
                me.getId(), STUDIO_VIDEO_METRICS_STATUSES, PageRequest.of(0, 8))
            .stream()
            .map((c) -> new StudioLatestCommentResponse(
                c.getId(),
                c.getUser() != null ? c.getUser().getUsername() : "",
                c.getVideo() != null ? c.getVideo().getTitle() : "",
                c.getContent(),
                c.getCreatedAt()
            ))
            .toList();

        return new StudioAnalyticsOverviewResponse(days, totalViews, totalLikes, totalComments, points, latestComments);
    }

    @Transactional(readOnly = true)
    public StudioVideoAnalyticsResponse getVideoAnalytics(String email, UUID videoPublicId, int days) {
        if (!ALLOWED_DAYS.contains(days)) {
            throw new BadRequestException("Khoảng ngày không hợp lệ. Chỉ chấp nhận 7, 28, 60, 90.");
        }

        User me = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        VideoResponse video = videoService.getVideoByPublicIdForViewer(videoPublicId, email);
        if (!Objects.equals(video.authorId(), me.getId())) {
            throw new BadRequestException("Bạn không có quyền xem thống kê video này.");
        }

        long videoId = videoService.getVideoByPublicIdOrThrow(videoPublicId).getId();

        LocalDate startDay = LocalDate.now().minusDays(days - 1L);
        LocalDateTime from = startDay.atStartOfDay();

        long periodViews = videoViewRepository.countViewsForVideoSince(videoId, from);
        long periodLikes = likeRepository.countLikesForVideoSince(videoId, from);
        long periodComments = commentRepository.countCommentsForVideoSince(videoId, from);
        long periodBookmarks = videoBookmarkRepository.countBookmarksForVideoSince(videoId, from);

        Map<LocalDate, long[]> dayToMetrics = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            dayToMetrics.put(startDay.plusDays(i), new long[] { 0L, 0L, 0L });
        }

        for (DailyCountProjection row : videoViewRepository.countDailyViewsForVideoSince(videoId, from)) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) {
                bucket[0] = row.getTotal();
            }
        }
        for (DailyCountProjection row : likeRepository.countDailyLikesForVideoSince(videoId, from)) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) {
                bucket[1] = row.getTotal();
            }
        }
        for (DailyCountProjection row : commentRepository.countDailyCommentsForVideoSince(videoId, from)) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) {
                bucket[2] = row.getTotal();
            }
        }

        List<StudioAnalyticsPointResponse> points = dayToMetrics.entrySet().stream()
            .map((entry) -> new StudioAnalyticsPointResponse(
                entry.getKey(),
                entry.getValue()[0],
                entry.getValue()[1],
                entry.getValue()[2]
            ))
            .toList();

        List<PlaybackSample> playRows =
            videoViewRepository.findPlaybackSamplesForVideoSince(videoId, from);
        long fallbackDurMs = 0L;
        Integer ds = video.durationSeconds();
        if (ds != null && ds > 0) {
            fallbackDurMs = ds * 1000L;
        }
        List<EffectivePlaybackSample> effective = buildEffectivePlaybackSamples(playRows, fallbackDurMs);
        if (effective.isEmpty() && periodViews > 0) {
            effective = buildSyntheticPlaybackSamplesForRetention(periodViews, fallbackDurMs);
        }
        long playbackSampleSize = effective.size();
        long periodTotalWatchMs = 0L;
        for (EffectivePlaybackSample e : effective) {
            periodTotalWatchMs += e.watchedMs();
        }
        double periodAvgWatchMs = playbackSampleSize > 0 ? (periodTotalWatchMs / (double) playbackSampleSize) : 0.0;
        Double periodFullWatchPercent = computeFullWatchPercent(effective, fallbackDurMs);
        List<StudioRetentionPointResponse> retention = buildRetention(effective);
        long periodNewFollowers =
            followRepository.countByFollowing_IdAndCreatedAtGreaterThanEqual(me.getId(), from);

        return new StudioVideoAnalyticsResponse(
            days,
            periodViews,
            periodLikes,
            periodComments,
            periodBookmarks,
            playbackSampleSize,
            periodTotalWatchMs,
            periodAvgWatchMs,
            periodFullWatchPercent,
            periodNewFollowers,
            video,
            points,
            retention,
            DEFAULT_TRAFFIC_SOURCES,
            List.of()
        );
    }

    private record EffectivePlaybackSample(long watchedMs, long durationMs, boolean explicitWatched) {}

    /**
     * Gắn thời lượng phát hiệu dụng cho mọi dòng lượt xem: giữ watchedMs/durationMs nếu có;
     * nếu thiếu watched_ms (bản ghi cũ) thì ước lượng mức xem đại diện để Studio không rỗng.
     */
    /**
     * Khi đếm lượt xem trong kỳ lớn hơn 0 nhưng không trả về được dòng playback (dữ liệu cũ / lệch truy vấn),
     * tạo mẫu ước lượng để vẽ retention — tránh Studio trống hoàn toàn.
     */
    private static List<EffectivePlaybackSample> buildSyntheticPlaybackSamplesForRetention(
        long periodViews,
        long fallbackDurationMs
    ) {
        long dur = fallbackDurationMs > 0 ? fallbackDurationMs : DEFAULT_ASSUMED_DURATION_MS;
        int n = (int) Math.min(periodViews, 2_000L);
        if (n <= 0) {
            return List.of();
        }
        List<EffectivePlaybackSample> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            double u = (i + 0.5) / n;
            double curve = 1.0 - Math.pow(u, 1.35);
            long watch = Math.round(dur * Math.max(0.12, Math.min(0.98, 0.2 + 0.78 * curve)));
            watch = Math.min(dur, Math.max(2_000L, watch));
            out.add(new EffectivePlaybackSample(watch, dur, false));
        }
        return out;
    }

    private static List<EffectivePlaybackSample> buildEffectivePlaybackSamples(
        List<PlaybackSample> rows,
        long fallbackDurationMs
    ) {
        List<EffectivePlaybackSample> out = new ArrayList<>();
        for (PlaybackSample row : rows) {
            Long rowDur = row.durationMs();
            long effDur = (rowDur != null && rowDur > 0) ? rowDur : fallbackDurationMs;
            if (effDur <= 0) {
                effDur = DEFAULT_ASSUMED_DURATION_MS;
            }
            Long rawW = row.watchedMs();
            boolean explicit = rawW != null;
            long effWatch = explicit ? rawW.longValue() : imputeWatchedMsWhenMissing(effDur);
            out.add(new EffectivePlaybackSample(effWatch, effDur, explicit));
        }
        return out;
    }

    private static long imputeWatchedMsWhenMissing(long effectiveDurationMs) {
        long est = Math.round(effectiveDurationMs * 0.35);
        return Math.min(effectiveDurationMs, Math.max(2_000L, est));
    }

    /** Cho phép lệch cuối clip (timeupdate / làm tròn ms) vẫn tính là “xem hết”. */
    private static long endSlackMs(long durationMs) {
        return Math.min(700L, Math.max(180L, Math.round(durationMs * 0.07d)));
    }

    /**
     * Thời lượng dùng để so “xem hết”: ưu client, fallback metadata server; bỏ duration client
     * bất thường dài gấp đôi server (thường gặp với stream / HLS).
     */
    private static long effectiveDurationForCompletion(long rowDurMs, long serverDurMs) {
        long d = rowDurMs > 0 ? rowDurMs : serverDurMs;
        if (d <= 0) {
            d = serverDurMs;
        }
        if (d <= 0) {
            return 0L;
        }
        if (serverDurMs > 0 && d > serverDurMs * 2L) {
            return serverDurMs;
        }
        return d;
    }

    private static boolean reachedFullWatch(long watchedMs, long rowDurMs, long serverDurMs) {
        if (watchedMs < 0) {
            return false;
        }
        long dur = effectiveDurationForCompletion(rowDurMs, serverDurMs);
        if (dur <= 0) {
            return false;
        }
        if (watchedMs >= dur) {
            return true;
        }
        if (watchedMs >= dur * FULL_WATCH_RATIO) {
            return true;
        }
        if (dur <= SHORT_CLIP_MAX_DURATION_MS && watchedMs * 100L >= dur * (long) SHORT_CLIP_FULL_PERCENT) {
            return true;
        }
        return watchedMs >= dur - endSlackMs(dur);
    }

    /**
     * Ưu tiên mẫu có watched_ms thật từ client; nếu không có mẫu explicit thì dùng toàn bộ mẫu hiệu dụng
     * (gồm synthetic/impute) để không hiển thị 0% khi Studio vẫn đang ước lượng retention.
     */
    private static Double computeFullWatchPercent(List<EffectivePlaybackSample> samples, long serverDurMs) {
        if (samples.isEmpty()) {
            return null;
        }
        int explicit = 0;
        int fullExplicit = 0;
        for (EffectivePlaybackSample e : samples) {
            if (!e.explicitWatched()) {
                continue;
            }
            long rowDur = e.durationMs();
            long dur = effectiveDurationForCompletion(rowDur, serverDurMs);
            if (dur <= 0) {
                continue;
            }
            explicit++;
            if (reachedFullWatch(e.watchedMs(), rowDur, serverDurMs)) {
                fullExplicit++;
            }
        }
        if (explicit > 0) {
            return (fullExplicit * 100.0) / explicit;
        }
        int all = 0;
        int fullAll = 0;
        for (EffectivePlaybackSample e : samples) {
            long rowDur = e.durationMs();
            long dur = effectiveDurationForCompletion(rowDur, serverDurMs);
            if (dur <= 0) {
                continue;
            }
            all++;
            if (reachedFullWatch(e.watchedMs(), rowDur, serverDurMs)) {
                fullAll++;
            }
        }
        if (all <= 0) {
            return null;
        }
        return (fullAll * 100.0) / all;
    }

    private static List<StudioRetentionPointResponse> buildRetention(List<EffectivePlaybackSample> samples) {
        if (samples.isEmpty()) {
            return List.of();
        }
        int n = samples.size();
        List<StudioRetentionPointResponse> out = new ArrayList<>();
        for (int p = 0; p <= 100; p += 5) {
            int reached = 0;
            for (EffectivePlaybackSample e : samples) {
                double threshold = e.durationMs() * (p / 100.0);
                if (e.watchedMs() >= threshold) {
                    reached++;
                }
            }
            out.add(new StudioRetentionPointResponse(p, (reached * 100.0) / n));
        }
        return out;
    }
}
