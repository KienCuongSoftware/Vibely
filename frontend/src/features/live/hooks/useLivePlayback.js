import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { createWebRtcPlaybackController } from '@/features/live/media/webrtc/webrtcPlaybackController.js'
import { liveService } from '@/features/live/services/liveService.js'

const IDLE_PLAYBACK_STATE = Object.freeze({
  status: 'idle',
  stream: null,
  errorCode: null,
  hostReconnecting: false,
  peerDisconnected: false,
  reconnectAttempt: 0,
})
const noopSubscribe = () => () => {}
const idleSnapshot = () => IDLE_PLAYBACK_STATE

/**
 * One WebRTC playback session per mounted player. Room events (`streamSignal`) only speed
 * things up; playback works on its own through polling when the realtime channel is down.
 */
export function useWebRtcPlayback({ liveId, ended = false, streamSignal = null }) {
  const { token } = useAuth()
  const [controller, setController] = useState(null)
  const tokenRef = useRef(token)
  tokenRef.current = token
  const endedRef = useRef(ended)
  endedRef.current = ended

  useEffect(() => {
    if (!liveId) return undefined
    const next = createWebRtcPlaybackController({
      getPlaybackInfo: () => liveService.getPlayback(liveId, tokenRef.current),
    })
    setController(next)
    if (endedRef.current) next.notifyEnded()
    else next.start()
    return () => {
      next.dispose()
      setController(null)
    }
  }, [liveId])

  useEffect(() => {
    if (ended) controller?.notifyEnded()
  }, [controller, ended])

  useEffect(() => {
    if (streamSignal) controller?.notifyStreamState(streamSignal)
  }, [controller, streamSignal])

  const state = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    controller?.getState ?? idleSnapshot,
  )
  const retry = useCallback(() => controller?.retry(), [controller])

  return { state, retry, controller }
}
