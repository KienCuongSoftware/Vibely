import { LIVE_MEDIA } from '@/features/live/constants/liveConstants.js'
import {
  captureErrorCode,
  LIVE_MEDIA_ERROR,
  LiveMediaError,
  toBackendMediaError,
} from '@/features/live/media/mediaErrors.js'
import { createReconnectBackoff } from '@/features/live/media/webrtc/reconnectBackoff.js'
import { deleteSdpResource, exchangeSdp } from '@/features/live/media/webrtc/sdpSignaling.js'
import {
  canPublishH264,
  closePeer,
  isCaptureSupported,
  isSecureMediaContext,
  isWebRtcSupported,
  preferH264,
  waitForConnected,
} from '@/features/live/media/webrtc/webrtcSupport.js'

/**
 * Host publisher: camera/mic capture + one send-only RTCPeerConnection to SRS over WHIP.
 * Implements the HostMediaController interface (see ../hostMediaController.js).
 *
 * - The WHIP endpoint is requested from the backend for every connection attempt
 *   (`getPublishInfo`); credentials are single-use, so a reconnect never reuses one.
 * - Mic/camera toggles flip `track.enabled` (silence / black frames are sent), so the
 *   peer connection stays up and no renegotiation is needed.
 * - Peer `failed`, or `disconnected` for longer than DISCONNECTED_GRACE_MS, reconnects with
 *   bounded exponential backoff; the old peer and its SRS session are always torn down first.
 * - Device ids live in memory only.
 */

const DEVICE_KINDS = ['audioinput', 'videoinput']

const INITIAL_STATE = Object.freeze({
  status: 'idle',
  micEnabled: true,
  cameraEnabled: true,
  previewStream: null,
  error: null,
  reconnectAttempt: 0,
  maxReconnectAttempts: LIVE_MEDIA.RECONNECT_MAX_ATTEMPTS,
  devices: Object.freeze({ audioinput: [], videoinput: [] }),
  selectedDeviceIds: Object.freeze({ audioinput: null, videoinput: null }),
})

function stopTracks(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

function abortError() {
  return new DOMException('Aborted', 'AbortError')
}

function waitUntilOnline(signal) {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const done = () => {
      window.removeEventListener('online', done)
      signal.removeEventListener('abort', onAbort)
      resolve()
    }
    const onAbort = () => {
      window.removeEventListener('online', done)
      reject(abortError())
    }
    window.addEventListener('online', done)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * @param {Object} options
 * @param {() => Promise<import('../../api/liveContracts.js').LivePublishInfo>} options.getPublishInfo
 * @param {Partial<typeof LIVE_MEDIA>} [options.timing]   overrides for tests
 * @param {MediaDevices} [options.mediaDevices]
 * @param {import('../hostMediaPreferences.js').HostMediaPreferences|null} [options.initial]
 */
export function createWebRtcHostMediaController({ getPublishInfo, timing = {}, mediaDevices, initial = null } = {}) {
  const config = { ...LIVE_MEDIA, ...timing }
  const devicesApi = mediaDevices ?? (typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined)
  const backoff = createReconnectBackoff({
    baseMs: config.RECONNECT_BASE_MS,
    maxDelayMs: config.RECONNECT_MAX_DELAY_MS,
    maxAttempts: config.RECONNECT_MAX_ATTEMPTS,
  })

  let state = {
    ...INITIAL_STATE,
    maxReconnectAttempts: config.RECONNECT_MAX_ATTEMPTS,
    ...(initial
      ? {
          micEnabled: initial.micEnabled !== false,
          cameraEnabled: initial.cameraEnabled !== false,
          selectedDeviceIds: { ...INITIAL_STATE.selectedDeviceIds, ...initial.selectedDeviceIds },
        }
      : null),
  }
  const listeners = new Set()
  let stream = null
  let pc = null
  let senders = { audio: null, video: null }
  let resourceUrl = null
  let abort = null
  let runId = 0
  let retryTimer = 0
  let graceTimer = 0
  let wantPublishing = false
  let disposed = false
  let unloadAttached = false
  let deviceWatchAttached = false

  const setState = (patch) => {
    if (disposed) return
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  const fail = (code, stage) => setState({ status: 'error', error: { code, stage } })

  /* ---------- capture ---------- */

  const constraintFor = (kind, deviceId = state.selectedDeviceIds[kind]) => {
    const base = kind === 'videoinput' ? config.VIDEO_CONSTRAINTS : config.AUDIO_CONSTRAINTS
    return deviceId ? { ...base, deviceId: { exact: deviceId } } : { ...base }
  }

  const applyEnabled = () => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = state.micEnabled
    })
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = state.cameraEnabled
    })
  }

  const onTrackEnded = () => {
    // Fired when the device disappears or the OS revokes access (not on our own stop()).
    setState({ error: { code: LIVE_MEDIA_ERROR.DEVICE_LOST, stage: 'device' } })
  }

  const watchTrack = (track) => track.addEventListener?.('ended', onTrackEnded)
  const unwatchTrack = (track) => track.removeEventListener?.('ended', onTrackEnded)

  const currentDeviceId = (kind) => {
    const track = kind === 'videoinput' ? stream?.getVideoTracks()[0] : stream?.getAudioTracks()[0]
    return track?.getSettings?.().deviceId ?? null
  }

  const refreshDevices = async () => {
    if (typeof devicesApi?.enumerateDevices !== 'function') return
    try {
      const all = await devicesApi.enumerateDevices()
      if (disposed) return
      const devices = { audioinput: [], videoinput: [] }
      all.forEach((device, index) => {
        if (!DEVICE_KINDS.includes(device.kind) || !device.deviceId) return
        devices[device.kind].push({ deviceId: device.deviceId, label: device.label || `${device.kind} ${index + 1}` })
      })
      setState({
        devices,
        selectedDeviceIds: { audioinput: currentDeviceId('audioinput'), videoinput: currentDeviceId('videoinput') },
      })
    } catch {
      // device listing is optional
    }
  }

  const attachDeviceWatch = () => {
    if (deviceWatchAttached || typeof devicesApi?.addEventListener !== 'function') return
    devicesApi.addEventListener('devicechange', refreshDevices)
    deviceWatchAttached = true
  }

  const detachDeviceWatch = () => {
    if (!deviceWatchAttached) return
    devicesApi.removeEventListener('devicechange', refreshDevices)
    deviceWatchAttached = false
  }

  const setStream = (next) => {
    stream?.getTracks().forEach(unwatchTrack)
    stream = next
    stream?.getTracks().forEach(watchTrack)
  }

  /* ---------- publishing ---------- */

  const onPageHide = () => {
    // The tab is going away: tell SRS now instead of waiting for its STUN timeout.
    deleteSdpResource(resourceUrl)
    resourceUrl = null
  }

  const attachUnload = () => {
    if (unloadAttached || typeof window === 'undefined') return
    window.addEventListener('pagehide', onPageHide)
    unloadAttached = true
  }

  const detachUnload = () => {
    if (!unloadAttached) return
    window.removeEventListener('pagehide', onPageHide)
    unloadAttached = false
  }

  const teardownPeer = () => {
    clearTimeout(graceTimer)
    graceTimer = 0
    abort?.abort()
    abort = null
    closePeer(pc)
    pc = null
    senders = { audio: null, video: null }
    deleteSdpResource(resourceUrl)
    resourceUrl = null
  }

  const scheduleReconnect = (code) => {
    clearTimeout(retryTimer)
    const delay = backoff.next()
    if (delay == null) {
      wantPublishing = false
      detachUnload()
      setState({ status: 'error', error: { code, stage: 'publish' }, reconnectAttempt: backoff.attempts })
      return
    }
    setState({ status: 'reconnecting', error: { code, stage: 'publish' }, reconnectAttempt: backoff.attempts })
    retryTimer = setTimeout(() => {
      retryTimer = 0
      if (wantPublishing && !disposed) void connect()
    }, delay)
  }

  const handleFailure = (error) => {
    teardownPeer()
    const mediaError = error instanceof LiveMediaError
      ? error
      : new LiveMediaError(LIVE_MEDIA_ERROR.CONNECTION_FAILED, { cause: error })
    if (mediaError.code === LIVE_MEDIA_ERROR.LIVE_ENDED) {
      wantPublishing = false
      detachUnload()
      setState({ status: 'ended', error: null, reconnectAttempt: 0 })
      return
    }
    if (mediaError.terminal) {
      wantPublishing = false
      detachUnload()
      fail(mediaError.code, 'publish')
      return
    }
    scheduleReconnect(mediaError.code)
  }

  const reconnectNow = () => {
    runId += 1
    teardownPeer()
    scheduleReconnect(LIVE_MEDIA_ERROR.CONNECTION_FAILED)
  }

  const onPeerStateChange = (peer, id) => {
    if (id !== runId || peer !== pc || state.status !== 'publishing') return
    if (peer.connectionState === 'connected') {
      clearTimeout(graceTimer)
      graceTimer = 0
    } else if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
      reconnectNow()
    } else if (peer.connectionState === 'disconnected' && !graceTimer) {
      graceTimer = setTimeout(() => {
        graceTimer = 0
        if (peer === pc && peer.connectionState !== 'connected') reconnectNow()
      }, config.DISCONNECTED_GRACE_MS)
    }
  }

  async function connect() {
    runId += 1
    const id = runId
    teardownPeer()
    abort = new AbortController()
    const { signal } = abort
    setState({ status: backoff.attempts ? 'reconnecting' : 'connecting', reconnectAttempt: backoff.attempts })

    try {
      await waitUntilOnline(signal)
      let info
      try {
        info = await getPublishInfo()
      } catch (error) {
        throw toBackendMediaError(error)
      }
      if (id !== runId) return
      if (!info?.whipUrl) throw new LiveMediaError(LIVE_MEDIA_ERROR.SERVER_UNAVAILABLE)
      if (!stream) throw new LiveMediaError(LIVE_MEDIA_ERROR.DEVICE_LOST)

      const peer = new RTCPeerConnection({ iceServers: info.iceServers ?? [], bundlePolicy: 'max-bundle' })
      pc = peer
      const audioTrack = stream.getAudioTracks()[0]
      const videoTrack = stream.getVideoTracks()[0]
      if (audioTrack) {
        senders.audio = peer.addTransceiver(audioTrack, { direction: 'sendonly', streams: [stream] }).sender
      }
      if (videoTrack) {
        const transceiver = peer.addTransceiver(videoTrack, { direction: 'sendonly', streams: [stream] })
        preferH264(transceiver)
        senders.video = transceiver.sender
      }
      peer.onconnectionstatechange = () => onPeerStateChange(peer, id)

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (id !== runId) return

      let exchange
      try {
        exchange = await exchangeSdp(info.whipUrl, peer.localDescription.sdp, { signal })
      } catch (error) {
        // SRS refuses a second publisher on the same stream by dropping the request (a 502 behind
        // nginx), which looks like an outage; the session flag tells the two apart.
        if (info.activePublisher && error instanceof LiveMediaError) {
          throw new LiveMediaError(LIVE_MEDIA_ERROR.PUBLISHER_BUSY, { cause: error })
        }
        throw error
      }
      if (id !== runId) {
        deleteSdpResource(exchange.resourceUrl)
        return
      }
      resourceUrl = exchange.resourceUrl
      await peer.setRemoteDescription({ type: 'answer', sdp: exchange.answer })
      await waitForConnected(peer, { timeoutMs: config.CONNECT_TIMEOUT_MS, signal })
      if (id !== runId) return

      backoff.reset()
      setState({ status: 'publishing', error: null, reconnectAttempt: 0 })
    } catch (error) {
      if (id !== runId || error?.name === 'AbortError') return
      handleFailure(error)
    }
  }

  const stopPublishing = () => {
    wantPublishing = false
    runId += 1
    clearTimeout(retryTimer)
    retryTimer = 0
    teardownPeer()
    detachUnload()
  }

  const controller = {
    kind: 'webrtc',
    requiresCapture: true,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** Asks for camera + microphone and shows the preview. Safe to call again after an error. */
    async prepare() {
      if (disposed || ['preparing', 'connecting', 'publishing', 'reconnecting'].includes(state.status)) return
      if (!isSecureMediaContext()) return fail(LIVE_MEDIA_ERROR.INSECURE_CONTEXT, 'capture')
      if (!isCaptureSupported(devicesApi) || !isWebRtcSupported()) return fail(LIVE_MEDIA_ERROR.UNSUPPORTED, 'capture')
      if (!canPublishH264()) return fail(LIVE_MEDIA_ERROR.CODEC_UNSUPPORTED, 'capture')

      setState({ status: 'preparing', error: null })
      try {
        let captured
        try {
          captured = await devicesApi.getUserMedia({
            audio: constraintFor('audioinput'),
            video: constraintFor('videoinput'),
          })
        } catch (error) {
          // A remembered device may have been unplugged; fall back to the browser defaults once.
          const pinned = state.selectedDeviceIds.audioinput || state.selectedDeviceIds.videoinput
          if (!pinned || !['OverconstrainedError', 'NotFoundError'].includes(error?.name)) throw error
          setState({ selectedDeviceIds: { audioinput: null, videoinput: null } })
          captured = await devicesApi.getUserMedia({
            audio: constraintFor('audioinput', null),
            video: constraintFor('videoinput', null),
          })
        }
        if (disposed) {
          stopTracks(captured)
          return
        }
        stopTracks(stream)
        setStream(captured)
        applyEnabled()
        setState({ status: 'ready', previewStream: stream, error: null })
        attachDeviceWatch()
        await refreshDevices()
      } catch (error) {
        fail(captureErrorCode(error), 'capture')
      }
    },

    /** Starts (or restarts) publishing with a fresh credential and a fresh retry budget. */
    async publish() {
      if (disposed || !stream) return
      wantPublishing = true
      clearTimeout(retryTimer)
      retryTimer = 0
      backoff.reset()
      attachUnload()
      await connect()
    },

    /** Stops publishing and closes the SRS session; capture and preview stay on. */
    async unpublish() {
      stopPublishing()
      setState({ status: stream ? 'ready' : 'idle', error: null, reconnectAttempt: 0 })
    },

    /** Manual retry after an error: re-acquire devices if capture failed, otherwise publish again. */
    async retry() {
      if (!stream) return controller.prepare()
      return controller.publish()
    },

    setMicEnabled(enabled) {
      const value = Boolean(enabled)
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = value
      })
      setState({ micEnabled: value })
    },

    setCameraEnabled(enabled) {
      const value = Boolean(enabled)
      stream?.getVideoTracks().forEach((track) => {
        track.enabled = value
      })
      setState({ cameraEnabled: value })
    },

    /** Swaps the camera or microphone without renegotiating (RTCRtpSender.replaceTrack). */
    async switchDevice(kind, deviceId) {
      if (disposed || !stream || !DEVICE_KINDS.includes(kind) || !deviceId) return
      const isVideo = kind === 'videoinput'
      let captured = null
      try {
        captured = await devicesApi.getUserMedia(
          isVideo ? { video: constraintFor(kind, deviceId) } : { audio: constraintFor(kind, deviceId) },
        )
        const nextTrack = isVideo ? captured.getVideoTracks()[0] : captured.getAudioTracks()[0]
        if (disposed || !stream || !nextTrack) {
          stopTracks(captured)
          return
        }
        nextTrack.enabled = isVideo ? state.cameraEnabled : state.micEnabled
        const sender = isVideo ? senders.video : senders.audio
        if (sender) await sender.replaceTrack(nextTrack)
        const previous = isVideo ? stream.getVideoTracks() : stream.getAudioTracks()
        const kept = stream.getTracks().filter((track) => !previous.includes(track))
        previous.forEach((track) => {
          unwatchTrack(track)
          track.stop()
        })
        setStream(new MediaStream([...kept, nextTrack]))
        setState({
          previewStream: stream,
          error: state.error?.stage === 'device' ? null : state.error,
          selectedDeviceIds: { ...state.selectedDeviceIds, [kind]: currentDeviceId(kind) ?? deviceId },
        })
      } catch (error) {
        stopTracks(captured)
        setState({ error: { code: captureErrorCode(error), stage: 'device' } })
      }
    },

    /** Stops publishing and releases camera/mic (LIVE ended). The controller can prepare again. */
    release() {
      stopPublishing()
      stopTracks(stream)
      setStream(null)
      detachDeviceWatch()
      setState({ status: 'idle', previewStream: null, reconnectAttempt: 0 })
    },

    dispose() {
      controller.release()
      disposed = true
      listeners.clear()
    },
  }

  return controller
}
