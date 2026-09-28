import { useCallback } from 'react'
import { liveService } from '@/features/live/services/liveService.js'
import { useLiveResource } from '@/features/live/hooks/useLiveResource.js'

/** Discovery page data for the active category filter. */
export function useLiveDiscovery({ category, token }) {
  const loader = useCallback(() => liveService.getDiscovery({ category }, token), [category, token])
  return useLiveResource(loader)
}

/** LIVE metadata (title, host, settings, status, playback). */
export function useLiveDetail({ liveId, token }) {
  const loader = useCallback(() => liveService.getLive(liveId, token), [liveId, token])
  return useLiveResource(loader, { enabled: Boolean(liveId) })
}
