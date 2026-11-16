package com.vibely.backend.admin;

import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.moderation.ModerationReportRepository;
import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private static final int DEFAULT_DAYS = 14;

    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final VideoViewRepository videoViewRepository;
    private final ModerationReportRepository moderationReportRepository;

    public AdminDashboardService(
        UserRepository userRepository,
        VideoRepository videoRepository,
        VideoViewRepository videoViewRepository,
        ModerationReportRepository moderationReportRepository
    ) {
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
        this.videoViewRepository = videoViewRepository;
        this.moderationReportRepository = moderationReportRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(int days) {
        int safeDays = days < 1 ? DEFAULT_DAYS : Math.min(days, 90);
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(safeDays - 1L);
        LocalDateTime from = start.atStartOfDay();

        long totalUsers = userRepository.count();
        long totalVideos = videoRepository.count();
        long periodReports = moderationReportRepository.countByCreatedAtGreaterThanEqual(from);
        long periodViews = videoViewRepository.countByCreatedAtGreaterThanEqual(from);

        long ready = videoRepository.countByStatus(VideoStatus.READY);
        long draftStudio = videoRepository.countByStudioDraftTrue();
        long raw = videoRepository.countByStatus(VideoStatus.RAW);
        long processing = videoRepository.countByStatus(VideoStatus.PROCESSING);
        long failed = videoRepository.countByStatus(VideoStatus.FAILED);
        long reported = videoRepository.countByStatus(VideoStatus.REPORTED);
        long hidden = videoRepository.countByStatus(VideoStatus.HIDDEN);
        long removed = videoRepository.countByStatus(VideoStatus.REMOVED);

        long draft = draftStudio + raw + processing + failed;
        long flagged = reported + hidden;

        Map<LocalDate, Long> usersByDay = toDayMap(userRepository.countDailyCreatedSince(from));
        Map<LocalDate, Long> videosByDay = toDayMap(videoRepository.countDailyCreatedSince(from));
        Map<LocalDate, Long> reportsByDay = toDayMap(moderationReportRepository.countDailyCreatedSince(from));
        Map<LocalDate, Long> viewsByDay = toDayMap(videoViewRepository.countDailyViewsSince(from));

        long usersBefore = userRepository.countByCreatedAtLessThan(from);
        long videosBefore = videoRepository.countByCreatedAtLessThan(from);

        List<AdminDashboardResponse.DayPoint> series = new ArrayList<>(safeDays);
        long runningUsers = usersBefore;
        long runningVideos = videosBefore;
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            long newUsers = usersByDay.getOrDefault(day, 0L);
            long newVideos = videosByDay.getOrDefault(day, 0L);
            long reports = reportsByDay.getOrDefault(day, 0L);
            long views = viewsByDay.getOrDefault(day, 0L);
            runningUsers += newUsers;
            runningVideos += newVideos;
            series.add(
                new AdminDashboardResponse.DayPoint(
                    day.toString(),
                    newUsers,
                    newVideos,
                    reports,
                    views,
                    runningUsers,
                    runningVideos
                )
            );
        }

        return new AdminDashboardResponse(
            safeDays,
            new AdminDashboardResponse.Totals(totalUsers, totalVideos, periodReports, periodViews),
            new AdminDashboardResponse.StatusMix(ready, draft, flagged, removed),
            series
        );
    }

    private static Map<LocalDate, Long> toDayMap(List<DailyCountProjection> rows) {
        Map<LocalDate, Long> map = new HashMap<>();
        if (rows == null) {
            return map;
        }
        for (DailyCountProjection row : rows) {
            if (row == null || row.getDay() == null) {
                continue;
            }
            map.put(row.getDay(), row.getTotal());
        }
        return map;
    }
}
