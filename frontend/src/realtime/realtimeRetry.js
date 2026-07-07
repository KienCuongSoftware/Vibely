export const REALTIME_RETRY_DELAY_MS = 30000

export function scheduleRealtimeRetry(callback, delayMs = REALTIME_RETRY_DELAY_MS) {
  return window.setTimeout(callback, delayMs)
}
