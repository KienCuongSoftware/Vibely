import { isValidQualityMode } from './hlsQualityUtils.js'

/** @typedef {import('./hlsQualityUtils.js').FeedVideoQualityMode} FeedVideoQualityMode */

const STORAGE_KEY = 'vibely_feed_video_quality'

/** @returns {FeedVideoQualityMode} */
export function readStoredFeedVideoQuality() {
  try {
    const value = String(localStorage.getItem(STORAGE_KEY) ?? '').trim()
    if (isValidQualityMode(value)) return value
  } catch {
    /* private mode / quota */
  }
  return 'auto'
}

/** @param {FeedVideoQualityMode} mode */
export function writeStoredFeedVideoQuality(mode) {
  if (!isValidQualityMode(mode)) return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* private mode / quota */
  }
}
