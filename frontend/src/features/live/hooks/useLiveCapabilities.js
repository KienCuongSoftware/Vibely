import { useEffect, useState } from 'react'
import { liveService } from '@/features/live/services/liveService.js'

const NONE = Object.freeze({ media: false, recording: false, hlsFallback: false, maxDurationMinutes: 0, maxReplaySeconds: 0 })

/** Deployment configuration does not change while the page is open: fetched once per session. */
let pending = null

function loadCapabilities(token) {
  if (!pending) {
    pending = Promise.resolve()
      .then(() => liveService.getCapabilities?.(token))
      .then((capabilities) => capabilities ?? NONE)
      .catch(() => {
        pending = null
        return NONE
      })
  }
  return pending
}

/** @returns {import('../api/liveContracts.js').LiveCapabilities} everything false until loaded or on error */
export function useLiveCapabilities(token) {
  const [capabilities, setCapabilities] = useState(NONE)

  useEffect(() => {
    let cancelled = false
    void loadCapabilities(token).then((value) => {
      if (!cancelled) setCapabilities(value)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  return capabilities
}

/** Tests only. */
export function resetLiveCapabilitiesCache() {
  pending = null
}
