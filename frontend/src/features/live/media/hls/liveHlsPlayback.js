const HLS_MIME = 'application/vnd.apple.mpegurl'

/** True when this browser can play an HLS live playlist (MSE for hls.js, or native HLS). */
export function isHlsPlaybackSupported() {
  if (typeof window === 'undefined') return false
  if (typeof window.MediaSource !== 'undefined' || typeof window.ManagedMediaSource !== 'undefined') return true
  if (typeof document === 'undefined') return false
  return Boolean(document.createElement('video').canPlayType?.(HLS_MIME))
}

/**
 * Attaches a live HLS playlist to `element`: hls.js where MediaSource exists, native HLS (Safari)
 * otherwise. hls.js is loaded on demand so WebRTC viewers never download it.
 *
 * `onFatal` fires at most once, when playback cannot continue (expired token, LIVE ended, network
 * gone). The caller decides what happens next; this module never retries beyond hls.js's own
 * bounded per-request retries.
 *
 * @param {HTMLMediaElement} element
 * @param {string} url
 * @param {{ onFatal?: (cause: unknown) => void }} [options]
 * @returns {() => void} detach
 */
export function attachLiveHls(element, url, { onFatal } = {}) {
  let disposed = false
  let failed = false
  let hls = null

  const fail = (cause) => {
    if (disposed || failed) return
    failed = true
    onFatal?.(cause)
  }
  const onNativeError = () => fail(element.error)

  import('hls.js')
    .then(({ default: Hls }) => {
      if (disposed) return
      if (Hls.isSupported()) {
        hls = new Hls({
          liveSyncDurationCount: 3,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 4,
        })
        let mediaRecoveries = 0
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data?.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 1) {
            mediaRecoveries += 1
            hls.recoverMediaError()
            return
          }
          fail(data)
        })
        hls.loadSource(url)
        hls.attachMedia(element)
        return
      }
      if (element.canPlayType?.(HLS_MIME)) {
        element.addEventListener('error', onNativeError)
        element.src = url
        return
      }
      fail(new Error('HLS playback is not supported'))
    })
    .catch(fail)

  return () => {
    disposed = true
    hls?.destroy()
    hls = null
    element.removeEventListener('error', onNativeError)
    if (element.getAttribute?.('src')) {
      element.removeAttribute('src')
      element.load?.()
    }
  }
}
