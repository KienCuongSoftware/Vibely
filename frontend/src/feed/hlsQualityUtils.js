/** @typedef {'auto' | '540' | '720'} FeedVideoQualityMode */

const QUALITY_ORDER = ['auto', '540', '720']

/**
 * @param {import('hls.js').Level[] | undefined} levels
 * @returns {FeedVideoQualityMode[]}
 */
export function getAvailableQualitiesFromLevels(levels) {
  const heights = (levels ?? [])
    .map((level) => Number(level?.height ?? 0))
    .filter((height) => height > 0)
  const has540 = heights.some((height) => Math.abs(height - 540) <= 4)
  const has720 = heights.some((height) => Math.abs(height - 720) <= 4)
  /** @type {FeedVideoQualityMode[]} */
  const options = ['auto']
  if (has540) options.push('540')
  if (has720) options.push('720')
  return options
}

/**
 * @param {import('hls.js').Level[]} levels
 * @param {number} targetHeight
 */
export function findLevelIndexByHeight(levels, targetHeight) {
  for (let i = 0; i < levels.length; i += 1) {
    const height = Number(levels[i]?.height ?? 0)
    if (height === targetHeight) return i
  }
  for (let i = 0; i < levels.length; i += 1) {
    const height = Number(levels[i]?.height ?? 0)
    if (height > 0 && Math.abs(height - targetHeight) <= 4) return i
  }
  return -1
}

/**
 * @param {import('hls.js').default} hls
 * @param {FeedVideoQualityMode} mode
 */
export function applyStreamQuality(hls, mode) {
  if (!hls?.levels?.length) return false
  try {
    if (mode === 'auto') {
      hls.currentLevel = -1
      return true
    }
    const targetHeight = mode === '720' ? 720 : 540
    const picked = findLevelIndexByHeight(hls.levels, targetHeight)
    if (picked < 0) {
      hls.currentLevel = -1
      return false
    }
    hls.currentLevel = picked
    return true
  } catch {
    return false
  }
}

/**
 * @param {FeedVideoQualityMode[]} options
 * @returns {FeedVideoQualityMode[]}
 */
export function sortQualityOptions(options) {
  return [...options].sort(
    (a, b) => QUALITY_ORDER.indexOf(a) - QUALITY_ORDER.indexOf(b),
  )
}
