/** Đồng bộ logic với backend VideoService.qualifiesPlaybackForView */
const VIEW_MIN_PLAYED_MS = 2000;
const VIEW_MIN_CLIENT_MS = 500;
const VIEW_SANITY_MAX_MS = 3_600_000;
const SHORT_CLIP_QUALIFY_PERCENT = 25;

/**
 * @param {number} watchedMs
 * @param {number | null | undefined} durationMs
 */
export function watchTimeQualifiesForViewRecord(watchedMs, durationMs) {
  if (!Number.isFinite(watchedMs) || watchedMs < VIEW_MIN_CLIENT_MS)
    return false;
  if (watchedMs > VIEW_SANITY_MAX_MS) return false;
  const dur =
    durationMs != null && Number.isFinite(durationMs) && durationMs > 0
      ? durationMs
      : 0;
  if (dur > 0 && dur < VIEW_MIN_PLAYED_MS) {
    return watchedMs * 100 >= dur * SHORT_CLIP_QUALIFY_PERCENT;
  }
  return watchedMs >= VIEW_MIN_PLAYED_MS;
}

/**
 * Đủ gần cuối clip để gửi thêm một bản ghi playback (Studio % xem hết).
 * Đồng bộ ý tưởng với StudioAnalyticsService.reachedFullWatch (tỷ lệ + slack).
 *
 * @param {number} watchedMs
 * @param {number} durationMs
 */
export function watchTimeNearPlaythroughEnd(watchedMs, durationMs) {
  if (
    !Number.isFinite(watchedMs) ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  )
    return false;
  if (watchedMs > VIEW_SANITY_MAX_MS) return false;
  if (watchedMs <= 500) return false;
  if (watchedMs >= durationMs) return true;
  if (watchedMs >= durationMs * 0.88) return true;
  if (durationMs <= 30_000 && watchedMs * 100 >= durationMs * 82) return true;
  const slack = Math.min(
    700,
    Math.max(180, Math.round(durationMs * 0.07)),
  );
  return watchedMs >= durationMs - slack;
}
