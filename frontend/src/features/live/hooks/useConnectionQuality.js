import { useEffect, useState } from 'react'
import {
  createConnectionStatsSampler,
  LIVE_CONNECTION_QUALITY,
  UNKNOWN_CONNECTION_SAMPLE,
} from '@/features/live/media/webrtc/liveConnectionStats.js'

/**
 * Samples a media controller's WebRTC stats while `active`. `reconnecting` overrides the
 * measured quality (there is no meaningful sample while the peer is being replaced).
 *
 * @param {Object} options
 * @param {{ getStats?: () => Promise<RTCStatsReport|null> }|null} options.controller
 * @param {'inbound'|'outbound'} options.direction
 * @param {boolean} options.active
 * @param {boolean} [options.reconnecting]
 * @returns {import('@/features/live/media/webrtc/liveConnectionStats.js').LiveConnectionSample}
 */
export function useConnectionQuality({ controller, direction, active, reconnecting = false }) {
  const [sample, setSample] = useState(UNKNOWN_CONNECTION_SAMPLE)

  useEffect(() => {
    if (!active || typeof controller?.getStats !== 'function') return undefined
    const sampler = createConnectionStatsSampler({
      getStats: () => controller.getStats(),
      direction,
      onSample: setSample,
    })
    sampler.start()
    return () => sampler.stop()
  }, [controller, direction, active])

  if (reconnecting) return { ...UNKNOWN_CONNECTION_SAMPLE, quality: LIVE_CONNECTION_QUALITY.RECONNECTING }
  return active ? sample : UNKNOWN_CONNECTION_SAMPLE
}
