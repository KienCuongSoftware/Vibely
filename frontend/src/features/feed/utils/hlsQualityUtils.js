/** @typedef {'auto' | string} FeedVideoQualityMode */

/**
 * @param {unknown} mode
 * @returns {mode is FeedVideoQualityMode}
 */
export function isValidQualityMode(mode) {
  if (mode === 'auto') return true
  const height = Number(mode)
  return Number.isFinite(height) && height >= 240 && height <= 4320
}

/**
 * Parse master playlist (#EXT-X-STREAM-INF RESOLUTION=) when hls.js is unavailable (Safari native HLS).
 * @param {string} playlistText
 * @returns {FeedVideoQualityMode[]}
 */
export function getAvailableQualitiesFromMasterPlaylist(playlistText) {
  /** @type {number[]} */
  const heights = []
  for (const raw of String(playlistText ?? '').split(/\r?\n/)) {
    const match = raw.match(/RESOLUTION=\d+x(\d+)/i)
    if (!match) continue
    const height = Number(match[1])
    if (Number.isFinite(height) && height > 0) heights.push(height)
  }
  return getAvailableQualitiesFromLevels(heights.map((height) => ({ height })))
}

/**
 * @param {import('hls.js').Level[] | undefined} levels
 * @returns {FeedVideoQualityMode[]}
 */
export function getAvailableQualitiesFromLevels(levels) {
  const heights = [
    ...new Set(
      (levels ?? [])
        .map((level) => Number(level?.height ?? 0))
        .filter((height) => height > 0),
    ),
  ].sort((a, b) => b - a)
  /** @type {FeedVideoQualityMode[]} */
  const options = ['auto']
  const seenLabels = new Set()
  for (const height of heights) {
    const label = formatQualityLabel(String(height))
    if (seenLabels.has(label)) continue
    seenLabels.add(label)
    options.push(String(height))
  }
  return options
}

/**
 * Progressive MP4 (chưa có HLS): hiển thị đúng độ phân giải gốc nếu biết được.
 * @param {number | null | undefined} sourceHeightPx
 * @returns {FeedVideoQualityMode[]}
 */
export function getAvailableQualitiesFromSourceHeight(sourceHeightPx) {
  const height = Number(sourceHeightPx ?? 0)
  if (!Number.isFinite(height) || height <= 0) {
    return ['auto']
  }
  return ['auto', String(Math.round(height))]
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
    const targetHeight = Number(mode)
    if (!Number.isFinite(targetHeight)) return false
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
 * Gom chiều cao thực tế về bậc chuẩn (540/720/1080/4K) cho nhãn UI — giống TikTok.
 * @param {number} height
 */
function snapQualityHeightForLabel(height) {
  if (height >= 2160) return 2160
  if (height >= 1080) return 1080
  if (height >= 700) return 720
  if (height >= 500) return 540
  if (height >= 400) return 360
  return height
}

/**
 * @param {FeedVideoQualityMode} mode
 */
export function formatQualityLabel(mode) {
  if (mode === 'auto') return 'Tự động'
  const height = Number(mode)
  if (!Number.isFinite(height) || height <= 0) return 'Tự động'
  const snapped = snapQualityHeightForLabel(height)
  if (snapped >= 2160) return '4K'
  if (snapped >= 1080) return '1080P'
  if (snapped >= 720) return '720P'
  if (snapped >= 540) return '540P'
  return `${snapped}P`
}

/**
 * @param {FeedVideoQualityMode[]} options
 * @returns {FeedVideoQualityMode[]}
 */
export function sortQualityOptions(options) {
  const heights = options
    .filter((option) => option !== 'auto')
    .map((option) => Number(option))
    .filter((height) => Number.isFinite(height) && height > 0)
    .sort((a, b) => b - a)
  /** @type {FeedVideoQualityMode[]} */
  const sorted = ['auto']
  for (const height of heights) {
    sorted.push(String(height))
  }
  return sorted
}
