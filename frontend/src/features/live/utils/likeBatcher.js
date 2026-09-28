import { LIVE_LIKE } from '@/features/live/constants/liveConstants.js'

/**
 * Aggregates like taps and flushes them as one call per window, so rapid tapping
 * never produces one request (or socket frame) per click.
 *
 * @param {{ flush: (count: number) => Promise<unknown>|unknown, windowMs?: number, maxBatch?: number, onError?: (error: unknown, count: number) => void }} options
 */
export function createLikeBatcher({
  flush,
  windowMs = LIVE_LIKE.BATCH_WINDOW_MS,
  maxBatch = LIVE_LIKE.MAX_BATCH_SIZE,
  onError,
}) {
  let pending = 0
  let timer = null
  let disposed = false

  const sendBatch = () => {
    const count = Math.min(pending, maxBatch)
    pending -= count
    Promise.resolve()
      .then(() => flush(count))
      .catch((error) => onError?.(error, count))
  }

  const tick = () => {
    timer = null
    if (pending > 0) sendBatch()
    if (pending > 0 && !disposed) timer = setTimeout(tick, windowMs)
  }

  /** Sends whatever is pending immediately (e.g. on unmount or page hide). */
  const flushNow = () => {
    if (timer) clearTimeout(timer)
    timer = null
    while (pending > 0) sendBatch()
  }

  return {
    add(count = 1) {
      if (disposed || count <= 0) return
      pending += count
      if (!timer) timer = setTimeout(tick, windowMs)
    },
    flushNow,
    dispose() {
      flushNow()
      disposed = true
    },
    getPending: () => pending,
  }
}
