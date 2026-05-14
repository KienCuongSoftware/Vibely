package com.vibely.backend.studio;

/**
 * Đường cong retention: tại mốc % thời lượng video, % phiên xem còn đạt tới mốc đó.
 */
public record StudioRetentionPointResponse(int progressPercent, double retentionPercent) {}
