/**
 * Host-side media boundary (camera, microphone, publishing).
 *
 * @typedef {Object} HostMediaState
 * @property {'idle'|'ready'|'publishing'|'error'} status
 * @property {boolean} micEnabled
 * @property {boolean} cameraEnabled
 * @property {MediaStream|null} previewStream   null while no real capture exists
 *
 * @typedef {Object} HostMediaController
 * @property {() => HostMediaState} getState
 * @property {(listener: (state: HostMediaState) => void) => () => void} subscribe
 * @property {() => Promise<void>} prepare        acquire devices / show preview
 * @property {(publishInfo: { url: string, token?: string }) => Promise<void>} publish   WHIP/RTMP ingest on the media server
 * @property {() => Promise<void>} unpublish
 * @property {(enabled: boolean) => void} setMicEnabled
 * @property {(enabled: boolean) => void} setCameraEnabled
 * @property {() => void} dispose                 must stop every MediaStreamTrack
 *
 * A future `createWebRtcHostMediaController` implements the same interface with
 * `getUserMedia` + an `RTCPeerConnection` publishing to SRS (WHIP). Spring Boot only
 * issues the ingest URL/token; it never carries media.
 */

/** Placeholder controller: tracks toggle state only, never touches the camera or mic. */
export function createMockHostMediaController() {
  let state = { status: 'idle', micEnabled: true, cameraEnabled: true, previewStream: null }
  const listeners = new Set()

  const setState = (patch) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  return {
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
    setMicEnabled(enabled) {
      setState({ micEnabled: Boolean(enabled) })
    },
    setCameraEnabled(enabled) {
      setState({ cameraEnabled: Boolean(enabled) })
    },
    dispose() {
      state.previewStream?.getTracks().forEach((track) => track.stop())
      listeners.clear()
    },
  }
}

export function createHostMediaController() {
  return createMockHostMediaController()
}
