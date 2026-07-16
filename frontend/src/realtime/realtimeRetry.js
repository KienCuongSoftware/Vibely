export const REALTIME_RETRY_DELAY_MS = 60000

/** Exponential-ish backoff helper; min 30s, grows with attempt via caller. */
export function scheduleRealtimeRetry(callback, delayMs = REALTIME_RETRY_DELAY_MS) {
  return window.setTimeout(callback, Math.max(30_000, delayMs))
}
