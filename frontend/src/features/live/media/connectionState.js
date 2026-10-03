/**
 * Media connection state shown to users, derived from the controllers' detailed status.
 * DISCONNECTED covers both "not connected yet" and a dropped peer that may still recover on its own.
 */
export const LIVE_CONNECTION_STATE = Object.freeze({
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
  ENDED: 'ENDED',
})

/** @param {import('./hostMediaController.js').HostMediaState} state */
export function hostConnectionState(state) {
  switch (state?.status) {
    case 'connecting':
      return LIVE_CONNECTION_STATE.CONNECTING
    case 'publishing':
      return state.peerDisconnected ? LIVE_CONNECTION_STATE.DISCONNECTED : LIVE_CONNECTION_STATE.CONNECTED
    case 'reconnecting':
      return LIVE_CONNECTION_STATE.RECONNECTING
    case 'error':
      return state.error?.stage === 'publish' ? LIVE_CONNECTION_STATE.FAILED : LIVE_CONNECTION_STATE.DISCONNECTED
    case 'ended':
      return LIVE_CONNECTION_STATE.ENDED
    default:
      return LIVE_CONNECTION_STATE.DISCONNECTED
  }
}

/** @param {import('./webrtc/webrtcPlaybackController.js').LivePlaybackState} state */
export function playbackConnectionState(state) {
  switch (state?.status) {
    case 'connecting':
    case 'waiting':
      return LIVE_CONNECTION_STATE.CONNECTING
    case 'playing':
      return state.peerDisconnected ? LIVE_CONNECTION_STATE.DISCONNECTED : LIVE_CONNECTION_STATE.CONNECTED
    case 'reconnecting':
      return LIVE_CONNECTION_STATE.RECONNECTING
    case 'failed':
    case 'unavailable':
    case 'unsupported':
      return LIVE_CONNECTION_STATE.FAILED
    case 'ended':
      return LIVE_CONNECTION_STATE.ENDED
    default:
      return LIVE_CONNECTION_STATE.DISCONNECTED
  }
}
