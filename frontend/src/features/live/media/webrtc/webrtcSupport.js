/** Browser capability checks shared by the publisher and the player. */

export function isWebRtcSupported() {
  return typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function'
}

export function isCaptureSupported(mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined) {
  return typeof mediaDevices?.getUserMedia === 'function'
}

/** Camera/mic and WebRTC need HTTPS (localhost is treated as secure by browsers). */
export function isSecureMediaContext() {
  return typeof window === 'undefined' || window.isSecureContext !== false
}

function videoCodecs() {
  if (typeof RTCRtpSender === 'undefined' || typeof RTCRtpSender.getCapabilities !== 'function') return null
  return RTCRtpSender.getCapabilities('video')?.codecs ?? null
}

/** SRS ingests H.264 for WebRTC publish. Unknown capability lists are not treated as a failure. */
export function canPublishH264() {
  const codecs = videoCodecs()
  if (!codecs) return true
  return codecs.some((codec) => /h264/i.test(codec.mimeType))
}

/** Puts H.264 first so the answer from SRS can always match the offer. */
export function preferH264(transceiver) {
  const codecs = videoCodecs()
  if (!codecs || typeof transceiver?.setCodecPreferences !== 'function') return
  const h264 = codecs.filter((codec) => /h264/i.test(codec.mimeType))
  if (!h264.length) return
  const rest = codecs.filter((codec) => !/h264/i.test(codec.mimeType))
  try {
    transceiver.setCodecPreferences([...h264, ...rest])
  } catch {
    // Some browsers reject preference lists they do not fully support; the default order still works.
  }
}

/** Resolves when the peer reaches `connected`, rejects on `failed`/`closed` or after `timeoutMs`. */
export function waitForConnected(pc, { timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    if (pc.connectionState === 'connected') {
      resolve()
      return
    }
    let timer = 0
    const cleanup = () => {
      clearTimeout(timer)
      pc.removeEventListener('connectionstatechange', onChange)
      signal?.removeEventListener('abort', onAbort)
    }
    const onChange = () => {
      if (pc.connectionState === 'connected') {
        cleanup()
        resolve()
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanup()
        reject(new Error(`peer ${pc.connectionState}`))
      }
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    timer = setTimeout(() => {
      cleanup()
      reject(new Error('peer connect timeout'))
    }, timeoutMs)
    pc.addEventListener('connectionstatechange', onChange)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function closePeer(pc) {
  if (!pc) return
  pc.onconnectionstatechange = null
  pc.ontrack = null
  try {
    pc.close()
  } catch {
    // already closed
  }
}
