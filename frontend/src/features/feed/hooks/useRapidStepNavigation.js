import { useCallback, useEffect, useRef } from 'react'

/**
 * Coalesce rapid prev/next input into one batched step after a short delay.
 * Useful when users spam chevron buttons or arrow keys.
 */
export function useRapidStepNavigation({
  onStep,
  delayMs = 150,
  maxBurst = 10,
  /** Minimum gap between two flushes (prevents back-to-back navigations). */
  cooldownMs = 0,
} = {}) {
  const pendingRef = useRef(0)
  const timerRef = useRef(null)
  const cooldownUntilRef = useRef(0)
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  const flush = useCallback(() => {
    timerRef.current = null
    const steps = pendingRef.current
    pendingRef.current = 0
    if (!steps) return
    const clamped = Math.max(-maxBurst, Math.min(maxBurst, steps))
    onStepRef.current(clamped)
    if (cooldownMs > 0) {
      cooldownUntilRef.current = Date.now() + cooldownMs
    }
  }, [cooldownMs, maxBurst])

  const requestStep = useCallback(
    (delta) => {
      if (!delta) return
      pendingRef.current += delta
      if (timerRef.current != null) clearTimeout(timerRef.current)
      const wait =
        cooldownMs > 0
          ? Math.max(delayMs, cooldownUntilRef.current - Date.now())
          : delayMs
      timerRef.current = setTimeout(flush, Math.max(0, wait))
    },
    [cooldownMs, delayMs, flush],
  )

  const reset = useCallback(() => {
    pendingRef.current = 0
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => reset(), [reset])

  return { requestStep, reset }
}
