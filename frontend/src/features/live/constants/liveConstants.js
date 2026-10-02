export const LIVE_PATHS = Object.freeze({
  discovery: '/live',
  create: '/live/create',
  detail: (liveId) => `/live/${encodeURIComponent(liveId)}`,
  host: (liveId) => `/live/${encodeURIComponent(liveId)}/host`,
})

export const LIVE_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
})

export const LIVE_VISIBILITY = Object.freeze({
  PUBLIC: 'PUBLIC',
  FOLLOWERS: 'FOLLOWERS',
  FRIENDS: 'FRIENDS',
})

/** `following` and `recommended` are feed filters, not LIVE categories. */
export const LIVE_FEED_FILTER = Object.freeze({
  RECOMMENDED: 'recommended',
  FOLLOWING: 'following',
})

/** The backend assigns the category from the LIVE title (same classifier as Explore). */
export const LIVE_CATEGORIES = [
  { id: LIVE_FEED_FILTER.RECOMMENDED, labelKey: 'livePage.categories.recommended' },
  { id: LIVE_FEED_FILTER.FOLLOWING, labelKey: 'livePage.categories.following' },
  { id: 'gaming', labelKey: 'livePage.categories.gaming' },
  { id: 'lifestyle', labelKey: 'livePage.categories.lifestyle' },
  { id: 'freefire', labelKey: 'livePage.categories.freeFire' },
  { id: 'pubg', labelKey: 'livePage.categories.pubg' },
  { id: 'music', labelKey: 'livePage.categories.music' },
  { id: 'outdoor', labelKey: 'livePage.categories.outdoor' },
  { id: 'chat', labelKey: 'livePage.categories.chat' },
  { id: 'food', labelKey: 'livePage.categories.food' },
]

export function getLiveCategoryLabelKey(categoryId) {
  return (
    LIVE_CATEGORIES.find((category) => category.id === categoryId)?.labelKey ??
    'livePage.categories.recommended'
  )
}

/**
 * Discovery page sections. `categoryIds` decides which LIVEs belong to the rail;
 * `seeAllCategory` is the filter applied by its "See all" link.
 */
export const LIVE_DISCOVERY_SECTIONS = [
  { id: 'gaming', titleKey: 'livePage.sections.gaming', categoryIds: ['gaming', 'freefire', 'pubg'], seeAllCategory: 'gaming' },
  { id: 'lifestyle', titleKey: 'livePage.sections.lifestyle', categoryIds: ['lifestyle', 'music', 'outdoor', 'chat', 'food'], seeAllCategory: 'lifestyle' },
]

export const LIVE_LIMITS = Object.freeze({
  TITLE_MAX: 80,
  COMMENT_MAX: 150,
})

/** Cover snapshot taken from the camera preview when the host goes LIVE. */
export const LIVE_COVER_SNAPSHOT = Object.freeze({
  MAX_WIDTH: 720,
  TYPE: 'image/jpeg',
  QUALITY: 0.82,
})

export const LIVE_CHAT = Object.freeze({
  /** Messages kept in memory; older ones are dropped so long streams stay light. */
  MAX_BUFFERED_MESSAGES: 200,
  /** Distance from the bottom (px) within which new messages auto-scroll. */
  AUTO_SCROLL_THRESHOLD_PX: 80,
})

export const LIVE_LIKE = Object.freeze({
  /** Taps are aggregated and flushed at most once per window. */
  BATCH_WINDOW_MS: 1000,
  /** Upper bound per flush; matches the backend `live.like.max-per-request`. */
  MAX_BATCH_SIZE: 100,
  BURST_LIFETIME_MS: 900,
  MAX_VISIBLE_BURSTS: 12,
})

export const LIVE_DISCOVERY = Object.freeze({
  HERO_LIMIT: 4,
  SECTION_LIMIT: 8,
  SIDEBAR_CREATOR_LIMIT: 5,
})

export const LIVE_ROOM_EVENT = Object.freeze({
  COMMENT: 'comment',
  COMMENT_DELETED: 'commentDeleted',
  VIEWER_COUNT: 'viewerCount',
  LIKE_COUNT: 'likeCount',
  GIFT: 'gift',
  STATUS: 'status',
  /** Host media went up/down on the media server: `{ publishing, reconnectDeadline }`. */
  STREAM: 'stream',
})

/** `live.playback.type` values the backend can announce. */
export const LIVE_PLAYBACK_TYPE = Object.freeze({
  WEBRTC: 'webrtc',
})

/** Backend `reason` on LIVE_ENDED. */
export const LIVE_END_REASON = Object.freeze({
  HOST: 'host',
  ADMIN: 'admin',
  HOST_DISCONNECTED: 'host_disconnected',
  PUBLISH_TIMEOUT: 'publish_timeout',
})

export const LIVE_MEDIA = Object.freeze({
  /** Reconnect backoff: 1s, 2s, 4s, 8s, 16s (capped), then give up and offer a manual retry. */
  RECONNECT_BASE_MS: 1000,
  RECONNECT_MAX_DELAY_MS: 16000,
  RECONNECT_MAX_ATTEMPTS: 6,
  /** How long ICE/DTLS may take before an attempt counts as failed. */
  CONNECT_TIMEOUT_MS: 15000,
  /** A `disconnected` peer often recovers by itself; only reconnect when it lasts longer. */
  DISCONNECTED_GRACE_MS: 4000,
  /** Viewer re-checks whether the host is publishing while waiting. */
  PLAYBACK_WAIT_POLL_MS: 5000,
  /** Capture defaults; the browser picks the closest mode the device supports. */
  VIDEO_CONSTRAINTS: Object.freeze({
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  }),
  AUDIO_CONSTRAINTS: Object.freeze({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }),
})

export const LIVE_CONNECTION_STATE = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
})

export const LIVE_REALTIME = Object.freeze({
  /** Room topic on the Spring STOMP broker (`/ws`). */
  topic: (liveId) => `/topic/live/${liveId}`,
  /** REST polling cadence for guests (no WebSocket session) or when the socket is down. */
  POLL_INTERVAL_MS: 5000,
  /** Delay before trying the WebSocket again after it dropped. */
  SOCKET_RETRY_MS: 15000,
})

/** Media layout breakpoint — matches the feed's mobile layout (max-width: 1023px). */
export const LIVE_MOBILE_MEDIA_QUERY = '(max-width: 1023px)'
