package com.vibely.backend.studio;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoViewRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudioAnalyticsService {

    private static final List<Integer> ALLOWED_DAYS = List.of(7, 28, 60, 90);

    private final UserRepository userRepository;
    private final VideoViewRepository videoViewRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;

    public StudioAnalyticsService(
        UserRepository userRepository,
        VideoViewRepository videoViewRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository
    ) {
        this.userRepository = userRepository;
        this.videoViewRepository = videoViewRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
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

        long totalViews = videoViewRepository.countByVideoAuthorIdAndVideoStatusNotAndCreatedAtGreaterThanEqual(
            me.getId(),
            VideoStatus.REMOVED,
            from
        );
        long totalLikes = likeRepository.countByVideoAuthorIdAndVideoStatusNotAndCreatedAtGreaterThanEqual(
            me.getId(),
            VideoStatus.REMOVED,
            from
        );
        long totalComments = commentRepository.countByVideoAuthorIdAndVideoStatusNotAndCreatedAtGreaterThanEqual(
            me.getId(),
            VideoStatus.REMOVED,
            from
        );

        Map<LocalDate, long[]> dayToMetrics = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            dayToMetrics.put(startDay.plusDays(i), new long[] { 0L, 0L, 0L });
        }

        for (DailyCountProjection row : videoViewRepository.countDailyByAuthorSinceExcludingStatus(
            me.getId(),
            from,
            VideoStatus.REMOVED
        )) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) bucket[0] = row.getTotal();
        }
        for (DailyCountProjection row : likeRepository.countDailyByAuthorSinceExcludingStatus(
            me.getId(),
            from,
            VideoStatus.REMOVED
        )) {
            long[] bucket = dayToMetrics.get(row.getDay());
            if (bucket != null) bucket[1] = row.getTotal();
        }
        for (DailyCountProjection row : commentRepository.countDailyByAuthorSinceExcludingStatus(
            me.getId(),
            from,
            VideoStatus.REMOVED
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
            .findLatestByAuthorIdExcludingStatus(me.getId(), VideoStatus.REMOVED, PageRequest.of(0, 8))
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
}
