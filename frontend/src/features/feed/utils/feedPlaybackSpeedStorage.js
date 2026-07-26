const STORAGE_KEY = 'vibely_feed_playback_speed'

export const FEED_PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export function formatPlaybackSpeedBadge(rate) {
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return '1.0x'
  if (n === 1) return '1.0x'
  if (Number.isInteger(n)) return `${n}x`
  return `${n}x`
}

export function formatPlaybackSpeedOption(rate) {
  const n = Number(rate)
  if (n === 1) return '1'
  if (Number.isInteger(n)) return String(n)
  return String(n)
}

export function readStoredFeedPlaybackSpeed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return 1
    const n = Number(raw)
    return FEED_PLAYBACK_SPEEDS.includes(n) ? n : 1
  } catch {
    return 1
  }
}

export function writeStoredFeedPlaybackSpeed(rate) {
  try {
    localStorage.setItem(STORAGE_KEY, String(rate))
  } catch {
    /* ignore quota */
  }
}
