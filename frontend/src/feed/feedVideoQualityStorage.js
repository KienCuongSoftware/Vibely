/** @typedef {'auto' | '540' | '720'} FeedVideoQualityMode */

const STORAGE_KEY = 'vibely_feed_video_quality'

/** @returns {FeedVideoQualityMode} */
export function readStoredFeedVideoQuality() {
  try {
    const value = String(localStorage.getItem(STORAGE_KEY) ?? '').trim()
    if (value === '540' || value === '720' || value === 'auto') return value
  } catch {
    /* private mode / quota */
  }
  return 'auto'
}

/** @param {FeedVideoQualityMode} mode */
export function writeStoredFeedVideoQuality(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* private mode / quota */
  }
}
