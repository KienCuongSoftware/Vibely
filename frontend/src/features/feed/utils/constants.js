/** Client-side media slot state for feed video elements (not backend VideoStatus). */
export const VideoLifecycleState = Object.freeze({
  IDLE: 'IDLE',
  PRELOADING: 'PRELOADING',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  UNLOADED: 'UNLOADED',
})
