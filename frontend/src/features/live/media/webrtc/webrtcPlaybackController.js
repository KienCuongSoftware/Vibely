import { LIVE_MEDIA, LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { playbackConnectionState } from '@/features/live/media/connectionState.js'
import { attachLiveHls, isHlsPlaybackSupported } from '@/features/live/media/hls/liveHlsPlayback.js'
import { LIVE_MEDIA_ERROR, LiveMediaError, toBackendMediaError } from '@/features/live/media/mediaErrors.js'
import { createReconnectBackoff } from '@/features/live/media/webrtc/reconnectBackoff.js'
import { deleteSdpResource, exchangeSdp } from '@/features/live/media/webrtc/sdpSignaling.js'
import { closePeer, isWebRtcSupported, waitForConnected } from '@/features/live/media/webrtc/webrtcSupport.js'

/**
 * Viewer playback: one receive-only RTCPeerConnection to SRS over WHEP, with a one-way HLS
 * fallback when the backend offers one (`hlsUrl`).
 *
 * @typedef {Object} LivePlaybackState
 * @property {'idle'|'waiting'|'connecting'|'playing'|'reconnecting'|'failed'|'unavailable'|'unsupported'|'ended'} status
 * @property {'webrtc'|'hls'} transport
 * @property {MediaStream|null} stream        WebRTC remote stream
 * @property {string|null} hlsUrl             HLS playlist while playing over HLS
 * @property {string|null} errorCode          one of LIVE_MEDIA_ERROR when failed/unavailable
 * @property {boolean} hostReconnecting       host media dropped (LIVE interrupted); the backend grace period is running
 * @property {boolean} peerDisconnected       this viewer's peer dropped and may still recover
 * @property {number} reconnectAttempt
 *
 * `attach(video)` keeps the element in sync with the active transport until `detach()`.
 *
 * Starting playback is what counts this viewer (backend `on_play` hook), so a mounted page
 * that never connects is not counted. `waiting` re-checks every PLAYBACK_WAIT_POLL_MS (or
 * immediately on a STREAM room event) until the host publishes or the LIVE ends.
 *
 * HLS fallback: after HLS_FALLBACK_AFTER_ATTEMPTS failed WebRTC reconnects (or when WebRTC is not
 * supported) playback switches to HLS once. There is no automatic way back: a fatal HLS error ends
 * in `failed`, and only the manual retry starts over with WebRTC, so the transports cannot loop.
 */

const INITIAL_STATE = Object.freeze({
  status: 'idle',
  transport: 'webrtc',
  stream: null,
  hlsUrl: null,
  errorCode: null,
  hostReconnecting: false,
  peerDisconnected: false,
  reconnectAttempt: 0,
})

/**
 * @param {Object} options
 * @param {() => Promise<import('../../api/liveContracts.js').LivePlaybackInfo>} options.getPlaybackInfo
 * @param {Partial<typeof LIVE_MEDIA>} [options.timing]   overrides for tests
 * @param {typeof attachLiveHls} [options.attachHls]       overridable for tests
 * @param {() => boolean} [options.hlsSupported]
 */
export function createWebRtcPlaybackController({
  getPlaybackInfo,
  timing = {},
  attachHls = attachLiveHls,
  hlsSupported = isHlsPlaybackSupported,
} = {}) {
  const config = { ...LIVE_MEDIA, ...timing }
  const backoff = createReconnectBackoff({
    baseMs: config.RECONNECT_BASE_MS,
    maxDelayMs: config.RECONNECT_MAX_DELAY_MS,
    maxAttempts: config.RECONNECT_MAX_ATTEMPTS,
  })

  let state = INITIAL_STATE
  const listeners = new Set()
  let pc = null
  let resourceUrl = null
  let abort = null
  let runId = 0
  let timer = 0
  let graceTimer = 0
  let active = false
  let disposed = false
  let unloadAttached = false
  /** Last known host publishing flag; stream signals only act on changes, so repeats cannot loop. */
  let lastPublishing = null
  /** @type {HTMLMediaElement|null} */
  let mediaElement = null
  /** Transport the next connect uses; switches to 'hls' at most once per retry budget. */
  let mode = 'webrtc'
  let hlsFallbackUsed = false
  let lastHlsUrl = null
  let detachHls = null
  let attachedHlsUrl = null
  let hlsRun = 0

  const stopHls = () => {
    hlsRun += 1
    detachHls?.()
    detachHls = null
    attachedHlsUrl = null
  }

  const onHlsFatal = (run) => {
    if (run !== hlsRun || disposed || state.transport !== 'hls') return
    halt({ status: 'failed', errorCode: LIVE_MEDIA_ERROR.PLAYBACK_FAILED })
  }

  const syncMediaElement = () => {
    if (!mediaElement) return
    if (state.transport === 'hls' && state.hlsUrl) {
      if (mediaElement.srcObject) mediaElement.srcObject = null
      if (attachedHlsUrl === state.hlsUrl) return
      stopHls()
      const run = hlsRun
      attachedHlsUrl = state.hlsUrl
      detachHls = attachHls(mediaElement, state.hlsUrl, { onFatal: () => onHlsFatal(run) })
      return
    }
    if (detachHls) stopHls()
    if (mediaElement.srcObject !== state.stream) mediaElement.srcObject = state.stream ?? null
  }

  const setState = (patch) => {
    if (disposed) return
    state = { ...state, ...patch }
    syncMediaElement()
    listeners.forEach((listener) => listener(state))
  }

  const onPageHide = () => {
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
    deleteSdpResource(resourceUrl)
    resourceUrl = null
  }

  const schedule = (delay) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = 0
      if (active && !disposed) void connect()
    }, delay)
  }

  const halt = (patch) => {
    active = false
    runId += 1
    clearTimeout(timer)
    timer = 0
    teardownPeer()
    detachUnload()
    setState({ stream: null, hlsUrl: null, hostReconnecting: false, peerDisconnected: false, reconnectAttempt: 0, ...patch })
  }

  const switchToHls = () => {
    mode = 'hls'
    hlsFallbackUsed = true
    backoff.reset()
    void connect()
  }

  const scheduleReconnect = (code) => {
    if (mode === 'webrtc' && !hlsFallbackUsed && lastHlsUrl && backoff.attempts >= config.HLS_FALLBACK_AFTER_ATTEMPTS) {
      switchToHls()
      return
    }
    const delay = backoff.next()
    if (delay == null) {
      halt({ status: 'failed', errorCode: code })
      return
    }
    setState({
      status: 'reconnecting',
      stream: null,
      errorCode: code,
      peerDisconnected: false,
      reconnectAttempt: backoff.attempts,
    })
    schedule(delay)
  }

  const handleFailure = (error) => {
    teardownPeer()
    const mediaError = error instanceof LiveMediaError
      ? error
      : new LiveMediaError(LIVE_MEDIA_ERROR.PLAYBACK_FAILED, { cause: error })
    if (mediaError.code === LIVE_MEDIA_ERROR.LIVE_ENDED) {
      halt({ status: 'ended', errorCode: null })
    } else if (mediaError.terminal) {
      halt({ status: 'unavailable', errorCode: mediaError.code })
    } else {
      scheduleReconnect(mediaError.code)
    }
  }

  const reconnectNow = () => {
    runId += 1
    teardownPeer()
    scheduleReconnect(LIVE_MEDIA_ERROR.CONNECTION_FAILED)
  }

  const onPeerStateChange = (peer, id) => {
    if (id !== runId || peer !== pc || state.status !== 'playing') return
    if (peer.connectionState === 'connected') {
      clearTimeout(graceTimer)
      graceTimer = 0
      setState({ peerDisconnected: false })
    } else if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
      reconnectNow()
    } else if (peer.connectionState === 'disconnected' && !graceTimer) {
      setState({ peerDisconnected: true })
      graceTimer = setTimeout(() => {
        graceTimer = 0
        if (peer === pc && peer.connectionState !== 'connected') reconnectNow()
      }, config.DISCONNECTED_GRACE_MS)
    }
  }

  async function connect() {
    runId += 1
    const id = runId
    clearTimeout(timer)
    timer = 0
    teardownPeer()
    abort = new AbortController()
    const { signal } = abort
    if (state.status !== 'waiting') {
      setState({ status: backoff.attempts ? 'reconnecting' : 'connecting', reconnectAttempt: backoff.attempts })
    }

    try {
      let info
      try {
        info = await getPlaybackInfo()
      } catch (error) {
        throw toBackendMediaError(error)
      }
      if (id !== runId) return
      lastPublishing = Boolean(info?.publishing)
      lastHlsUrl = info?.hlsUrl || null
      if (info?.status === LIVE_STATUS.ENDED) {
        halt({ status: 'ended', errorCode: null })
        return
      }
      const ready = mode === 'hls' ? Boolean(info?.publishing) : Boolean(info?.publishing && info.whepUrl)
      if (!ready) {
        backoff.reset()
        setState({
          status: 'waiting',
          stream: null,
          hlsUrl: null,
          errorCode: null,
          reconnectAttempt: 0,
          hostReconnecting: Boolean(info?.interrupted),
        })
        schedule(config.PLAYBACK_WAIT_POLL_MS)
        return
      }
      if (mode === 'hls') {
        if (!info.hlsUrl) {
          // HLS was switched off meanwhile; without WebRTC support there is nothing left to try.
          const unsupported = !isWebRtcSupported()
          halt({
            status: unsupported ? 'unsupported' : 'failed',
            errorCode: unsupported ? LIVE_MEDIA_ERROR.UNSUPPORTED : LIVE_MEDIA_ERROR.PLAYBACK_FAILED,
          })
          return
        }
        backoff.reset()
        setState({
          status: 'playing',
          transport: 'hls',
          stream: null,
          hlsUrl: info.hlsUrl,
          errorCode: null,
          hostReconnecting: false,
          peerDisconnected: false,
          reconnectAttempt: 0,
        })
        return
      }
      if (state.status === 'waiting') setState({ status: 'connecting' })

      const peer = new RTCPeerConnection({ iceServers: info.iceServers ?? [], bundlePolicy: 'max-bundle' })
      pc = peer
      const remote = new MediaStream()
      peer.addTransceiver('audio', { direction: 'recvonly' })
      peer.addTransceiver('video', { direction: 'recvonly' })
      peer.ontrack = (event) => {
        if (!remote.getTracks().includes(event.track)) remote.addTrack(event.track)
      }
      peer.onconnectionstatechange = () => onPeerStateChange(peer, id)

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (id !== runId) return
      const exchange = await exchangeSdp(info.whepUrl, peer.localDescription.sdp, { signal })
      if (id !== runId) {
        deleteSdpResource(exchange.resourceUrl)
        return
      }
      resourceUrl = exchange.resourceUrl
      await peer.setRemoteDescription({ type: 'answer', sdp: exchange.answer })
      await waitForConnected(peer, { timeoutMs: config.CONNECT_TIMEOUT_MS, signal })
      if (id !== runId) return

      backoff.reset()
      setState({
        status: 'playing',
        transport: 'webrtc',
        hlsUrl: null,
        stream: remote,
        errorCode: null,
        hostReconnecting: false,
        peerDisconnected: false,
        reconnectAttempt: 0,
      })
    } catch (error) {
      if (id !== runId || error?.name === 'AbortError') return
      handleFailure(error)
    }
  }

  const controller = {
    getState: () => state,
    getConnectionState: () => playbackConnectionState(state),
    /** WebRTC stats of the current peer; null over HLS or without a peer. */
    getStats: () => (pc && state.transport === 'webrtc' ? pc.getStats() : Promise.resolve(null)),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** @param {HTMLMediaElement} element */
    attach(element) {
      if (disposed || !element) return
      if (mediaElement && mediaElement !== element) controller.detach()
      mediaElement = element
      syncMediaElement()
    },

    detach() {
      if (!mediaElement) return
      stopHls()
      mediaElement.srcObject = null
      mediaElement = null
    },

    start() {
      if (disposed || active) return
      if (!isWebRtcSupported()) {
        if (!hlsSupported()) {
          setState({ status: 'unsupported', errorCode: LIVE_MEDIA_ERROR.UNSUPPORTED })
          return
        }
        mode = 'hls'
        hlsFallbackUsed = true
      }
      active = true
      backoff.reset()
      attachUnload()
      void connect()
    },

    /** Manual retry from `failed`; gives the connection a fresh retry budget, WebRTC first. */
    retry() {
      if (disposed) return
      if (!active) {
        active = true
        attachUnload()
      }
      if (isWebRtcSupported()) {
        mode = 'webrtc'
        hlsFallbackUsed = false
      }
      backoff.reset()
      void connect()
    },

    /** Room event STREAM_STATE_UPDATED (`reconnectDeadline` set while the host reconnects). */
    notifyStreamState({ publishing, reconnectDeadline } = {}) {
      if (disposed || typeof publishing !== 'boolean') return
      if (!publishing && reconnectDeadline && active && state.status === 'waiting' && !state.hostReconnecting) {
        setState({ hostReconnecting: true })
      }
      if (publishing === lastPublishing) return
      lastPublishing = publishing
      if (!active) {
        if (publishing && state.status === 'failed') controller.retry()
        return
      }
      if (publishing) {
        // The host (re)published as a new SRS session: connect to it right away.
        backoff.reset()
        void connect()
      } else if (state.status === 'playing') {
        setState({ hostReconnecting: true })
      }
    },

    /** LIVE ended (room event or page status): stop for good. */
    notifyEnded() {
      if (disposed || state.status === 'ended') return
      halt({ status: 'ended', errorCode: null })
    },

    stop() {
      halt({ status: 'idle', errorCode: null })
    },

    dispose() {
      halt({ status: 'idle', errorCode: null })
      controller.detach()
      disposed = true
      listeners.clear()
    },
  }

  return controller
}
