import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { createHostMediaController, createHostPreviewController } from '@/features/live/media/hostMediaController.js'
import { hostMediaPreferencesFor } from '@/features/live/media/hostMediaPreferences.js'
import { liveService } from '@/features/live/services/liveService.js'
import { parseApiDateTime } from '@/shared/utils/relativeTimeVi.js'

const ELAPSED_TICK_MS = 1000

const IDLE_MEDIA_STATE = Object.freeze({
  status: 'idle',
  micEnabled: false,
  cameraEnabled: false,
  previewStream: null,
  error: null,
})
const noopSubscribe = () => () => {}
const idleSnapshot = () => IDLE_MEDIA_STATE

/**
 * Media controller lifecycle bound to the host page. Created inside the effect
 * so every mount owns (and disposes) its own devices. The implementation follows
 * `live.playback.type`: an ended LIVE has no descriptor, which swaps in the mock and
 * releases the camera. `previewOnly` is the Go LIVE screen: capture without a LIVE.
 */
export function useHostMedia({ liveId, token, playbackType, previewOnly = false } = {}) {
  const [controller, setController] = useState(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  useEffect(() => {
    const next = previewOnly
      ? createHostPreviewController()
      : createHostMediaController({
          playbackType,
          getPublishInfo: liveId ? () => liveService.getPublishInfo(liveId, tokenRef.current) : undefined,
          initial: liveId ? hostMediaPreferencesFor(liveId) : null,
        })
    setController(next)
    void next.prepare()
    return () => {
      next.dispose()
      setController(null)
    }
  }, [liveId, playbackType, previewOnly])

  const state = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    controller?.getState ?? idleSnapshot,
  )

  const getState = useCallback(() => controller?.getState() ?? IDLE_MEDIA_STATE, [controller])
  const prepare = useCallback(() => controller?.prepare(), [controller])
  const publish = useCallback(() => controller?.publish(), [controller])
  const unpublish = useCallback(() => controller?.unpublish(), [controller])
  const retry = useCallback(() => controller?.retry(), [controller])
  const release = useCallback(() => controller?.release(), [controller])
  const setMicEnabled = useCallback((enabled) => controller?.setMicEnabled(enabled), [controller])
  const setCameraEnabled = useCallback((enabled) => controller?.setCameraEnabled(enabled), [controller])
  const switchDevice = useCallback((kind, deviceId) => controller?.switchDevice(kind, deviceId), [controller])
  const startScreenShare = useCallback(() => controller?.startScreenShare?.(), [controller])
  const stopScreenShare = useCallback(() => controller?.stopScreenShare?.(), [controller])

  return {
    controller,
    kind: controller?.kind ?? null,
    requiresCapture: Boolean(controller?.requiresCapture),
    state,
    ready: Boolean(controller),
    getState,
    prepare,
    publish,
    unpublish,
    retry,
    release,
    setMicEnabled,
    setCameraEnabled,
    switchDevice,
    startScreenShare,
    stopScreenShare,
  }
}

/**
 * Start/end transitions for the host, plus a running duration while LIVE.
 * Publishing is driven by state, not by the click: whenever the LIVE is on air and
 * capture is ready, the controller publishes once — after Go LIVE, after a reload of an
 * ongoing LIVE, or after the host fixed a camera/mic permission problem.
 */
export function useLiveHostSession({ live, setLive, token, media }) {
  const [action, setAction] = useState(null)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const publishedForRef = useRef(null)

  const isLive = live?.status === LIVE_STATUS.LIVE
  const isEnded = live?.status === LIVE_STATUS.ENDED
  const { controller, requiresCapture, publish, release } = media
  const mediaStatus = media.state.status

  useEffect(() => {
    if (!isLive) return undefined
    const id = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS)
    return () => clearInterval(id)
  }, [isLive])

  useEffect(() => {
    if (!isLive || !controller || publishedForRef.current === controller) return
    if (requiresCapture && mediaStatus !== 'ready') return
    publishedForRef.current = controller
    void publish()
  }, [controller, isLive, mediaStatus, publish, requiresCapture])

  useEffect(() => {
    if (isEnded) release()
  }, [isEnded, release])

  // The backend refused a new credential because the LIVE is over (ended by the system or elsewhere).
  useEffect(() => {
    if (mediaStatus !== 'ended' || !isLive) return
    setLive((prev) => (prev && prev.status === LIVE_STATUS.LIVE ? { ...prev, status: LIVE_STATUS.ENDED } : prev))
  }, [isLive, mediaStatus, setLive])

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

  /** Camera/mic must be granted before the LIVE goes on air; the media banner explains a refusal. */
  const start = useCallback(async () => {
    if (requiresCapture) {
      if (media.getState().status !== 'ready') await media.prepare()
      if (media.getState().status !== 'ready') return
    }
    await run('start', liveService.startLive)
  }, [media, requiresCapture, run])

  const end = useCallback(async () => {
    const updated = await run('end', liveService.endLive)
    if (updated) release()
  }, [release, run])

  const startedAt = parseApiDateTime(live?.startedAt)?.getTime() ?? null
  const elapsedMs = isLive && startedAt ? Math.max(0, now - startedAt) : 0

  return { start, end, action, error, elapsedMs }
}
