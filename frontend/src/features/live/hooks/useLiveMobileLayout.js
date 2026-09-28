import { useSyncExternalStore } from 'react'
import { LIVE_MOBILE_MEDIA_QUERY } from '@/features/live/constants/liveConstants.js'

function subscribe(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia(LIVE_MOBILE_MEDIA_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(LIVE_MOBILE_MEDIA_QUERY).matches
}

/** Reactive version of `isMobileFeedLayout()` — re-renders when the viewport crosses the breakpoint. */
export function useLiveMobileLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
