import { LIVE_END_REASON } from '@/features/live/constants/liveConstants.js'
import { LIVE_MEDIA_ERROR } from '@/features/live/media/mediaErrors.js'

const ERROR_KEYS = {
  [LIVE_MEDIA_ERROR.PERMISSION_DENIED]: 'livePage.media.errors.permissionDenied',
  [LIVE_MEDIA_ERROR.DEVICE_NOT_FOUND]: 'livePage.media.errors.deviceNotFound',
  [LIVE_MEDIA_ERROR.DEVICE_BUSY]: 'livePage.media.errors.deviceBusy',
  [LIVE_MEDIA_ERROR.DEVICE_LOST]: 'livePage.media.errors.deviceLost',
  [LIVE_MEDIA_ERROR.UNSUPPORTED]: 'livePage.media.errors.unsupported',
  [LIVE_MEDIA_ERROR.INSECURE_CONTEXT]: 'livePage.media.errors.insecureContext',
  [LIVE_MEDIA_ERROR.CODEC_UNSUPPORTED]: 'livePage.media.errors.codecUnsupported',
  [LIVE_MEDIA_ERROR.PUBLISH_REJECTED]: 'livePage.media.errors.publishRejected',
  [LIVE_MEDIA_ERROR.PUBLISHER_BUSY]: 'livePage.media.errors.publisherBusy',
  [LIVE_MEDIA_ERROR.SERVER_UNAVAILABLE]: 'livePage.media.errors.serverUnavailable',
  [LIVE_MEDIA_ERROR.CONNECTION_FAILED]: 'livePage.media.errors.connectionFailed',
  [LIVE_MEDIA_ERROR.MEDIA_DISABLED]: 'livePage.media.errors.mediaDisabled',
  [LIVE_MEDIA_ERROR.LIVE_ENDED]: 'livePage.media.errors.liveEnded',
  [LIVE_MEDIA_ERROR.NOT_FOUND]: 'livePage.media.errors.notFound',
  [LIVE_MEDIA_ERROR.FORBIDDEN]: 'livePage.media.errors.forbidden',
  [LIVE_MEDIA_ERROR.PLAYBACK_FAILED]: 'livePage.media.errors.playbackFailed',
}

const END_REASON_KEYS = {
  [LIVE_END_REASON.ADMIN]: 'livePage.media.endReason.admin',
  [LIVE_END_REASON.HOST_DISCONNECTED]: 'livePage.media.endReason.hostDisconnected',
  [LIVE_END_REASON.PUBLISH_TIMEOUT]: 'livePage.media.endReason.publishTimeout',
}

export function mediaErrorMessageKey(code) {
  return ERROR_KEYS[code] ?? 'livePage.media.errors.connectionFailed'
}

/** Null for a normal end by the host (no extra explanation needed). */
export function endReasonMessageKey(reason) {
  return END_REASON_KEYS[reason] ?? null
}
