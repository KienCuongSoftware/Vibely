import { LIVE_PLAYBACK_TYPE } from '@/features/live/constants/liveConstants.js'
import { createWebRtcHostMediaController } from '@/features/live/media/webrtc/webrtcHostMediaController.js'

/**
 * Host-side media boundary (camera, microphone, publishing).
 *
 * @typedef {Object} HostMediaError
 * @property {string} code     one of LIVE_MEDIA_ERROR
 * @property {'capture'|'publish'|'device'} stage
 *
 * @typedef {Object} HostMediaState
 * @property {'idle'|'preparing'|'ready'|'connecting'|'publishing'|'reconnecting'|'error'|'ended'} status
 * @property {boolean} micEnabled
 * @property {boolean} cameraEnabled
 * @property {MediaStream|null} previewStream   null while no real capture exists
 * @property {HostMediaError|null} [error]
 * @property {number} [reconnectAttempt]
 * @property {number} [maxReconnectAttempts]
 * @property {{ audioinput: Array<{deviceId: string, label: string}>, videoinput: Array<{deviceId: string, label: string}> }} [devices]
 * @property {{ audioinput: string|null, videoinput: string|null }} [selectedDeviceIds]
 *
 * @typedef {Object} HostMediaController
 * @property {'mock'|'webrtc'} kind
 * @property {boolean} requiresCapture          true when going LIVE needs camera/mic access first
 * @property {() => HostMediaState} getState
 * @property {(listener: (state: HostMediaState) => void) => () => void} subscribe
 * @property {() => Promise<void>} prepare        acquire devices / show preview
 * @property {() => Promise<void>} publish        publish to the media server (credential fetched per attempt)
 * @property {() => Promise<void>} unpublish
 * @property {() => Promise<void>} retry          manual retry after an error
 * @property {(enabled: boolean) => void} setMicEnabled
 * @property {(enabled: boolean) => void} setCameraEnabled
 * @property {(kind: 'audioinput'|'videoinput', deviceId: string) => Promise<void>} switchDevice
 * @property {() => void} release                 stop publishing and release devices
 * @property {() => void} dispose                 must stop every MediaStreamTrack
 *
 * The WebRTC implementation publishes to SRS over WHIP. Spring Boot only issues the
 * single-use ingest endpoint; it never carries media.
 */

/** Placeholder controller: tracks toggle state only, never touches the camera or mic. */
export function createMockHostMediaController() {
  let state = { status: 'idle', micEnabled: true, cameraEnabled: true, previewStream: null, error: null }
  const listeners = new Set()

  const setState = (patch) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  return {
    kind: 'mock',
    requiresCapture: false,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async prepare() {
      setState({ status: 'ready' })
    },
    async publish() {
      setState({ status: 'publishing' })
    },
    async unpublish() {
      setState({ status: 'ready' })
    },
    async retry() {
      setState({ status: 'ready', error: null })
    },
    setMicEnabled(enabled) {
      setState({ micEnabled: Boolean(enabled) })
    },
    setCameraEnabled(enabled) {
      setState({ cameraEnabled: Boolean(enabled) })
    },
    async switchDevice() {},
    release() {
      setState({ status: 'idle' })
    },
    dispose() {
      state.previewStream?.getTracks().forEach((track) => track.stop())
      listeners.clear()
    },
  }
}

/**
 * Picks the implementation announced by the backend (`live.playback.type`).
 * Without a media server (or for an ended LIVE) the mock keeps the studio usable
 * and never opens the camera.
 */
export function createHostMediaController({ playbackType, getPublishInfo } = {}) {
  if (playbackType === LIVE_PLAYBACK_TYPE.WEBRTC && typeof getPublishInfo === 'function') {
    return createWebRtcHostMediaController({ getPublishInfo })
  }
  return createMockHostMediaController()
}
