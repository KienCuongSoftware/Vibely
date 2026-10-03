import { LIVE_MEDIA, LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { playbackConnectionState } from '@/features/live/media/connectionState.js'
import { LIVE_MEDIA_ERROR, LiveMediaError, toBackendMediaError } from '@/features/live/media/mediaErrors.js'
import { createReconnectBackoff } from '@/features/live/media/webrtc/reconnectBackoff.js'
import { deleteSdpResource, exchangeSdp } from '@/features/live/media/webrtc/sdpSignaling.js'
import { closePeer, isWebRtcSupported, waitForConnected } from '@/features/live/media/webrtc/webrtcSupport.js'

/**
 * Viewer playback: one receive-only RTCPeerConnection to SRS over WHEP.
 *
 * @typedef {Object} LivePlaybackState
 * @property {'idle'|'waiting'|'connecting'|'playing'|'reconnecting'|'failed'|'unavailable'|'unsupported'|'ended'} status
 * @property {MediaStream|null} stream
 * @property {string|null} errorCode          one of LIVE_MEDIA_ERROR when failed/unavailable
 * @property {boolean} hostReconnecting       host media dropped; the backend grace period is running
 * @property {boolean} peerDisconnected       this viewer's peer dropped and may still recover
 * @property {number} reconnectAttempt
 *
 * `attach(video)` keeps the element's `srcObject` in sync with the remote stream until `detach()`.
 *
 * Starting playback is what counts this viewer (backend `on_play` hook), so a mounted page
 * that never connects is not counted. `waiting` re-checks every PLAYBACK_WAIT_POLL_MS (or
 * immediately on a STREAM room event) until the host publishes or the LIVE ends.
 */

const INITIAL_STATE = Object.freeze({
  status: 'idle',
  stream: null,
  errorCode: null,
  hostReconnecting: false,
  peerDisconnected: false,
  reconnectAttempt: 0,
})

/**
 * @param {Object} options
 * @param {() => Promise<import('../../api/liveContracts.js').LivePlaybackInfo>} options.getPlaybackInfo
 * @param {Partial<typeof LIVE_MEDIA>} [options.timing]   overrides for tests
 */
export function createWebRtcPlaybackController({ getPlaybackInfo, timing = {} } = {}) {
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

  const syncMediaElement = () => {
    if (mediaElement && mediaElement.srcObject !== state.stream) mediaElement.srcObject = state.stream ?? null
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
    setState({ stream: null, hostReconnecting: false, peerDisconnected: false, reconnectAttempt: 0, ...patch })
  }

  const scheduleReconnect = (code) => {
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
      if (info?.status === LIVE_STATUS.ENDED) {
        halt({ status: 'ended', errorCode: null })
        return
      }
      if (!info?.publishing || !info.whepUrl) {
        backoff.reset()
        setState({ status: 'waiting', stream: null, errorCode: null, reconnectAttempt: 0 })
        schedule(config.PLAYBACK_WAIT_POLL_MS)
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
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** @param {HTMLMediaElement} element */
    attach(element) {
      if (disposed || !element) return
      if (mediaElement && mediaElement !== element) mediaElement.srcObject = null
      mediaElement = element
      syncMediaElement()
    },

    detach() {
      if (!mediaElement) return
      mediaElement.srcObject = null
      mediaElement = null
    },

    start() {
      if (disposed || active) return
      if (!isWebRtcSupported()) {
        setState({ status: 'unsupported', errorCode: LIVE_MEDIA_ERROR.UNSUPPORTED })
        return
      }
      active = true
      backoff.reset()
      attachUnload()
      void connect()
    },

    /** Manual retry from `failed`; gives the connection a fresh retry budget. */
    retry() {
      if (disposed) return
      if (!active) {
        active = true
        attachUnload()
      }
      backoff.reset()
      void connect()
    },

    /** Room event STREAM_STATE_UPDATED. */
    notifyStreamState({ publishing } = {}) {
      if (disposed || typeof publishing !== 'boolean' || publishing === lastPublishing) return
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
