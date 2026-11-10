/**
 * Duration ổn định cho HLS/MSE (el.duration hay Infinity/NaN → seekable.end).
 * @param {HTMLMediaElement | null | undefined} el
 * @returns {number}
 */
export function getVideoDurationSeconds(el) {
  if (!el || el.tagName !== 'VIDEO') return 0
  if (Number.isFinite(el.duration) && el.duration > 0) return el.duration
  try {
    if (el.seekable?.length) {
      const end = el.seekable.end(el.seekable.length - 1)
      if (Number.isFinite(end) && end > 0) return end
    }
  } catch {
    /* noop */
  }
  return 0
}

/**
 * @param {number} seconds
 * @returns {string} HH:MM:SS hoặc MM:SS
 */
export function formatPlaybackTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hour = Math.floor(total / 3600)
  const minute = Math.floor((total % 3600) / 60)
  const second = total % 60
  if (hour > 0) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
  }
  return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}
