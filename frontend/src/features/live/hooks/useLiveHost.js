import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { createHostMediaController } from '@/features/live/media/hostMediaController.js'
import { liveService } from '@/features/live/services/liveService.js'

const ELAPSED_TICK_MS = 1000

const IDLE_MEDIA_STATE = Object.freeze({
  status: 'idle',
  micEnabled: false,
  cameraEnabled: false,
  previewStream: null,
})
const noopSubscribe = () => () => {}
const idleSnapshot = () => IDLE_MEDIA_STATE

/**
 * Media controller lifecycle bound to the host page. Created inside the effect
 * so every mount owns (and disposes) its own devices.
 */
export function useHostMedia() {
  const [controller, setController] = useState(null)

  useEffect(() => {
    const next = createHostMediaController()
    setController(next)
    void next.prepare()
    return () => {
      next.dispose()
      setController(null)
    }
  }, [])

  const state = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    controller?.getState ?? idleSnapshot,
  )

  const publish = useCallback((info) => controller?.publish(info), [controller])
  const unpublish = useCallback(() => controller?.unpublish(), [controller])
  const setMicEnabled = useCallback((enabled) => controller?.setMicEnabled(enabled), [controller])
  const setCameraEnabled = useCallback((enabled) => controller?.setCameraEnabled(enabled), [controller])

  return { state, ready: Boolean(controller), publish, unpublish, setMicEnabled, setCameraEnabled }
}

/** Start/end transitions for the host, plus a running duration while LIVE. */
export function useLiveHostSession({ live, setLive, token, media }) {
  const [action, setAction] = useState(null)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const isLive = live?.status === LIVE_STATUS.LIVE

  useEffect(() => {
    if (!isLive) return undefined
    const id = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS)
    return () => clearInterval(id)
  }, [isLive])

  const run = useCallback(
    async (kind, request) => {
      if (!live?.id || action) return
      setAction(kind)
      setError(null)
      try {
        const updated = await request(live.id, token)
        setLive(updated)
        return updated
      } catch (err) {
        setError(err)
        return null
      } finally {
        setAction(null)
      }
    },
    [action, live?.id, setLive, token],
  )

  const start = useCallback(async () => {
    const updated = await run('start', liveService.startLive)
    if (updated?.playback?.url) await media.publish(updated.playback)
  }, [media, run])

  const end = useCallback(async () => {
    const updated = await run('end', liveService.endLive)
    if (updated) await media.unpublish()
  }, [media, run])

  const startedAt = live?.startedAt ? Date.parse(live.startedAt) : null
  const elapsedMs = isLive && startedAt ? Math.max(0, now - startedAt) : 0

  return { start, end, action, error, elapsedMs }
}
