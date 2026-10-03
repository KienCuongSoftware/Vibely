/** Stable media error codes; the UI maps them to `livePage.media.errors.*`. */
export const LIVE_MEDIA_ERROR = Object.freeze({
  PERMISSION_DENIED: 'permission-denied',
  DEVICE_NOT_FOUND: 'device-not-found',
  DEVICE_BUSY: 'device-busy',
  DEVICE_LOST: 'device-lost',
  UNSUPPORTED: 'unsupported',
  INSECURE_CONTEXT: 'insecure-context',
  CODEC_UNSUPPORTED: 'codec-unsupported',
  PUBLISH_REJECTED: 'publish-rejected',
  PUBLISHER_BUSY: 'publisher-busy',
  SERVER_UNAVAILABLE: 'server-unavailable',
  CONNECTION_FAILED: 'connection-failed',
  MEDIA_DISABLED: 'media-disabled',
  LIVE_ENDED: 'live-ended',
  NOT_FOUND: 'not-found',
  FORBIDDEN: 'forbidden',
  PLAYBACK_FAILED: 'playback-failed',
  SCREEN_SHARE_FAILED: 'screen-share-failed',
})

/** Codes that a new attempt cannot fix; the controller stops instead of retrying. */
const TERMINAL_CODES = new Set([
  LIVE_MEDIA_ERROR.LIVE_ENDED,
  LIVE_MEDIA_ERROR.NOT_FOUND,
  LIVE_MEDIA_ERROR.FORBIDDEN,
  LIVE_MEDIA_ERROR.MEDIA_DISABLED,
  LIVE_MEDIA_ERROR.UNSUPPORTED,
  LIVE_MEDIA_ERROR.CODEC_UNSUPPORTED,
])

export class LiveMediaError extends Error {
  constructor(code, { cause } = {}) {
    super(code)
    this.name = 'LiveMediaError'
    this.code = code
    if (cause) this.cause = cause
  }

  get terminal() {
    return TERMINAL_CODES.has(this.code)
  }
}

export function isTerminalMediaError(error) {
  return error instanceof LiveMediaError && error.terminal
}

/** getUserMedia DOMException -> media error code. */
export function captureErrorCode(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return LIVE_MEDIA_ERROR.PERMISSION_DENIED
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return LIVE_MEDIA_ERROR.DEVICE_NOT_FOUND
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return LIVE_MEDIA_ERROR.DEVICE_BUSY
    default:
      return LIVE_MEDIA_ERROR.DEVICE_BUSY
  }
}

/** Error thrown by the Vibely REST client (`shared/api/http.js`) -> media error. */
export function toBackendMediaError(error) {
  if (error instanceof LiveMediaError) return error
  const code = (() => {
    if (error?.code === 'LIVE_ALREADY_ENDED') return LIVE_MEDIA_ERROR.LIVE_ENDED
    if (error?.code === 'MEDIA_DISABLED' || error?.status === 501) return LIVE_MEDIA_ERROR.MEDIA_DISABLED
    if (error?.code === 'LIVE_NOT_FOUND' || error?.status === 404) return LIVE_MEDIA_ERROR.NOT_FOUND
    if (error?.status === 401 || error?.status === 403) return LIVE_MEDIA_ERROR.FORBIDDEN
    if (error?.code === 'LIVE_NOT_ACTIVE') return LIVE_MEDIA_ERROR.PUBLISH_REJECTED
    return LIVE_MEDIA_ERROR.SERVER_UNAVAILABLE
  })()
  return new LiveMediaError(code, { cause: error })
}
