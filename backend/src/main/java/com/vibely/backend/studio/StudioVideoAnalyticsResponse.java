package com.vibely.backend.studio;

import com.vibely.backend.video.VideoResponse;
import java.util.List;

/** Thống kê một video (chỉ tác giả), tương đương TikTok Studio analytics theo bài. */
public record StudioVideoAnalyticsResponse(
    int days,
    long periodViews,
    long periodLikes,
    long periodComments,
    long periodBookmarks,
    /** Số lượt xem trong kỳ có lưu thời lượng phát (watched_ms). */
    long playbackSampleSize,
    /** Tổng thời gian phát (ms) trong kỳ; 0 nếu không có mẫu. */
    long periodTotalWatchMs,
    /** Trung bình watched_ms trong kỳ; 0 nếu không có mẫu. */
    double periodAvgWatchMs,
    /** % phiên (có duration hợp lệ) xem ≥ ~92% thời lượng; null nếu không tính được. */
    Double periodFullWatchPercent,
    /** Follower mới của kênh (không gán theo video) trong kỳ. */
    long periodNewFollowers,
    VideoResponse video,
    List<StudioAnalyticsPointResponse> points,
    List<StudioRetentionPointResponse> retention,
    List<StudioTrafficSourceResponse> trafficSources,
    List<StudioSearchKeywordResponse> searchKeywords
) {}
