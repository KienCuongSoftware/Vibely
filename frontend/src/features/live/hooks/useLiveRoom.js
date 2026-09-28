import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LIVE_CONNECTION_STATE } from '@/features/live/constants/liveConstants.js'
import { createLiveRoomChannel } from '@/features/live/services/liveRoomChannel.js'

/**
 * Owns the realtime channel of one room and fans events out by type, so chat,
 * viewer count and likes each re-render independently.
 */
export function useLiveRoom({ liveId, token, enabled = true, initialViewerCount = 0 }) {
  const [connectionState, setConnectionState] = useState(LIVE_CONNECTION_STATE.IDLE)
  const listenersRef = useRef(new Map())
  const channelRef = useRef(null)
  const initialViewerCountRef = useRef(initialViewerCount)
  initialViewerCountRef.current = initialViewerCount

  useEffect(() => {
    if (!enabled || !liveId) return undefined
    const channel = createLiveRoomChannel({
      liveId,
      token,
      initialViewerCount: initialViewerCountRef.current,
    })
    channelRef.current = channel
    channel.connect({
      onEvent: (event) => {
        listenersRef.current.get(event.type)?.forEach((handler) => handler(event.payload))
      },
      onStateChange: setConnectionState,
    })
    return () => {
      channelRef.current = null
      channel.disconnect()
    }
  }, [enabled, liveId, token])

  const subscribe = useCallback((type, handler) => {
    const listeners = listenersRef.current
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type).add(handler)
    return () => listeners.get(type)?.delete(handler)
  }, [])

  const sendComment = useCallback((message) => {
    const channel = channelRef.current
    if (!channel) return Promise.reject(new Error('LIVE room is not connected'))
    return channel.sendComment(message)
  }, [])

  return useMemo(
    () => ({ connectionState, subscribe, sendComment }),
    [connectionState, subscribe, sendComment],
  )
}
