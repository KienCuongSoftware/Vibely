import { LIVE_MEDIA } from '@/features/live/constants/liveConstants.js'

/**
 * Bounded exponential backoff. `next()` returns the delay before the next attempt,
 * or null once `maxAttempts` is exhausted — callers must then stop and surface an error.
 */
export function createReconnectBackoff({
  baseMs = LIVE_MEDIA.RECONNECT_BASE_MS,
  maxDelayMs = LIVE_MEDIA.RECONNECT_MAX_DELAY_MS,
  maxAttempts = LIVE_MEDIA.RECONNECT_MAX_ATTEMPTS,
} = {}) {
  let attempts = 0
  return {
    next() {
      if (attempts >= maxAttempts) return null
      const delay = Math.min(maxDelayMs, baseMs * 2 ** attempts)
      attempts += 1
      return delay
    },
    reset() {
      attempts = 0
    },
    get attempts() {
      return attempts
    },
    maxAttempts,
  }
}
